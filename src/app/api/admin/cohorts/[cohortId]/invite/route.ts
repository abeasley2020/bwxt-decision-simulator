/**
 * POST /api/admin/cohorts/[cohortId]/invite
 *
 * Provisions a user and adds them to a cohort in one operation.
 * All database writes use the service-role client to bypass RLS.
 *
 * Steps:
 *   1. Find or create auth.users account
 *   2. Find or create public.users record
 *   3. Create cohort_memberships (guard against duplicates)
 *   4. Create simulation_run for participants
 *   5. Return success
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS for all DB writes.
// Only used server-side; never exposed to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const cohortId = params.cohortId;

  // ── Verify caller is an authenticated admin ──────────────────────────────────
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerRow } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!callerRow || callerRow.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse request body ───────────────────────────────────────────────────────
  let body: { email?: string; role?: string; firstName?: string | null; lastName?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toString().trim().toLowerCase();
  const role = body.role;
  const firstName = body.firstName?.toString().trim() || null;
  const lastName = body.lastName?.toString().trim() || null;

  if (!email || !["participant", "faculty"].includes(role ?? "")) {
    return NextResponse.json(
      { error: "Valid email and role ('participant' or 'faculty') are required." },
      { status: 400 }
    );
  }

  // ── STEP 1 — Find or create auth user ───────────────────────────────────────
  console.log(`[invite] Step 1: looking up auth user for ${email}`);

  const {
    data: { users: authUsers },
  } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

  // Compare lowercased on both sides — Supabase Auth stores normalised emails
  // but defensive lowercasing prevents lookup misses if anything upstream
  // ever stored a mixed-case address.
  let authUser = authUsers.find((u) => u.email?.toLowerCase() === email) ?? null;
  let tempPassword: string | null = null;

  if (!authUser) {
    console.log(`[invite] Step 1: no auth account found — creating`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "Welcome2024!",
      email_confirm: true,
    });
    if (error) {
      console.error(`[invite] Step 1 FAILED: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    authUser = data.user;
    tempPassword = "Welcome2024!";
    console.log(`[invite] Step 1: created auth user ${authUser.id}`);
  } else {
    console.log(`[invite] Step 1: found existing auth user ${authUser.id}`);
  }

  const authUserId = authUser.id;

  // ── STEP 2 — Find or create public.users record ──────────────────────────────
  console.log(`[invite] Step 2: looking up public.users for ${email}`);

  // Use ilike for the lookup so a row stored with stray capitalisation still
  // matches and we don't end up creating a duplicate.
  const { data: publicUser } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  if (!publicUser) {
    console.log(`[invite] Step 2: no public.users record — creating`);
    const { error } = await supabaseAdmin.from("users").insert({
      id: authUserId,
      email,
      first_name: firstName ?? email.split("@")[0],
      last_name: lastName ?? "",
      role: role as string,
    });
    if (error) {
      console.error(`[invite] Step 2 FAILED: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log(`[invite] Step 2: created public.users record`);
  } else {
    console.log(`[invite] Step 2: found existing public.users record ${publicUser.id}`);

    // Fill in missing first/last name when the admin provided them now.
    // We don't overwrite real names that are already set, but we do replace
    // the email-prefix placeholder that the old invite path used to write.
    const emailPrefix = email.split("@")[0];
    const currentFirst = publicUser.first_name ?? "";
    const currentLast = publicUser.last_name ?? "";
    const firstIsPlaceholder = !currentFirst || currentFirst === emailPrefix;
    const lastIsPlaceholder = !currentLast;

    const updates: Record<string, string> = {};
    if (firstName && firstIsPlaceholder) updates.first_name = firstName;
    if (lastName && lastIsPlaceholder) updates.last_name = lastName;
    // Normalise stored email to lowercase if it isn't already
    if (publicUser.email !== email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update(updates)
        .eq("id", publicUser.id);
      if (updateError) {
        console.error(`[invite] Step 2 UPDATE FAILED: ${updateError.message}`);
        // Non-fatal — continue with cohort assignment.
      } else {
        console.log(`[invite] Step 2: updated public.users with`, Object.keys(updates));
      }
    }
  }

  const userId = publicUser?.id ?? authUserId;

  // ── STEP 3 — Check for existing membership, then insert ─────────────────────
  console.log(`[invite] Step 3: checking cohort membership`);

  const { data: existingMembership } = await supabaseAdmin
    .from("cohort_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .maybeSingle();

  if (existingMembership) {
    console.log(`[invite] Step 3: user already a member`);
    return NextResponse.json(
      { error: "This person is already a member of this cohort." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: memberError } = await supabaseAdmin
    .from("cohort_memberships")
    .insert({
      user_id: userId,
      cohort_id: cohortId,
      cohort_role: role,
      invitation_status: "accepted",
      invited_at: now,
      assigned_at: now,
    });

  if (memberError) {
    console.error(`[invite] Step 3 FAILED: ${memberError.message}`);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  console.log(`[invite] Step 3: created cohort membership`);

  // ── STEP 4 — Create simulation run for participants ──────────────────────────
  if (role === "participant") {
    console.log(`[invite] Step 4: checking simulation run`);

    const { data: existingRun } = await supabaseAdmin
      .from("simulation_runs")
      .select("id")
      .eq("user_id", userId)
      .eq("cohort_id", cohortId)
      .maybeSingle();

    if (!existingRun) {
      const { data: cohort } = await supabaseAdmin
        .from("cohorts")
        .select("scenario_version_id")
        .eq("id", cohortId)
        .maybeSingle();

      if (cohort?.scenario_version_id) {
        const { error: runError } = await supabaseAdmin
          .from("simulation_runs")
          .insert({
            user_id: userId,
            cohort_id: cohortId,
            scenario_version_id: cohort.scenario_version_id,
            status: "not_started",
            current_round_number: 1,
            is_preview: false,
          });
        if (runError) {
          console.error(`[invite] Step 4 FAILED: ${runError.message}`);
          return NextResponse.json({ error: runError.message }, { status: 500 });
        }
        console.log(`[invite] Step 4: created simulation run`);
      }
    } else {
      console.log(`[invite] Step 4: simulation run already exists`);
    }
  }

  // ── STEP 5 — Return success ──────────────────────────────────────────────────
  console.log(`[invite] Step 5: success for ${email}`);
  return NextResponse.json({
    ok: true,
    existed: !!publicUser,
    ...(tempPassword ? { tempPassword } : {}),
  });
}
