/**
 * POST /api/admin/cohorts/[cohortId]/invite
 *
 * Provisions a user and adds them to a cohort in one operation:
 *   1. Look up or create an auth.users account (via Supabase Admin API)
 *   2. Look up or create a public.users row with id = auth.users.id
 *   3. Create cohort_memberships record
 *   4. Create simulation_run record (participants only)
 *   5. Return temp password for new accounts (admin shares with the user)
 *
 * For existing users (email found in public.users):
 *   - Checks they are not already a member (409 if so)
 *   - Adds cohort_memberships with invitation_status = 'accepted'
 *   - Creates a simulation_run if one doesn't already exist
 *   - Does NOT change their existing password
 *   - Returns { ok: true, existed: true }
 *
 * For new users (email not found):
 *   - Creates auth.users via admin API (email_confirm = true, temp password)
 *   - Creates public.users with id = auth.users.id (IDs always match)
 *   - Creates cohort_memberships with invitation_status = 'accepted'
 *   - Creates simulation_run for participants
 *   - Returns { ok: true, existed: false, tempPassword: string }
 *
 * Request body: { email: string, role: "participant" | "faculty" }
 * Auth: admin role required.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment (server-side only).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Temp password generator ────────────────────────────────────────────────────
// Produces a 12-character password satisfying uppercase + lowercase + digit +
// special requirements. Characters that look alike (0/O, 1/l/I) are excluded.

function generateTempPassword(): string {
  const upper   = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower   = "abcdefghjkmnpqrstuvwxyz";
  const digits  = "23456789";
  const special = "!@#$";
  const pool    = upper + lower + digits;

  // Guarantee at least one of each required category
  const seeded = [
    upper  [Math.floor(Math.random() * upper.length)],
    lower  [Math.floor(Math.random() * lower.length)],
    digits [Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const filler = Array.from({ length: 8 }, () =>
    pool[Math.floor(Math.random() * pool.length)]
  );

  return [...seeded, ...filler]
    .sort(() => Math.random() - 0.5)
    .join("");
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const supabase      = createClient();
  const adminSupabase = createAdminClient();
  const now           = new Date().toISOString();

  // ── Admin auth check ────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow || adminRow.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toString().trim().toLowerCase();
  const role  = body.role;

  if (!email || !["participant", "faculty"].includes(role ?? "")) {
    return NextResponse.json(
      { error: "Valid email and role ('participant' or 'faculty') are required." },
      { status: 400 }
    );
  }

  // ── Check cohort exists (+ grab scenario_version_id for run creation) ───────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, scenario_version_id")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  // ── Resolve or create the user ──────────────────────────────────────────────
  // public.users is our application source of truth for user_id.
  // If a row already exists the user is provisioned; otherwise we create
  // both an auth account and a public.users row with the same UUID.

  const { data: existingPublicUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;
  let tempPassword: string | null = null;

  if (existingPublicUser) {
    // ── Existing user — use their current ID ──────────────────────────────
    userId = existingPublicUser.id;
  } else {
    // ── New user — create auth account first so IDs always match ─────────
    tempPassword = generateTempPassword();

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // bypass email verification for admin-provisioned accounts
      });

    if (authError) {
      return NextResponse.json(
        { error: `Failed to create auth account: ${authError.message}` },
        { status: 500 }
      );
    }

    userId = authData.user.id;

    // Create public.users with the same UUID as auth.users so every
    // downstream query using auth session ID finds the correct row.
    const { error: publicUserError } = await supabase.from("users").insert({
      id:         userId,
      email,
      first_name: "",
      last_name:  "",
      role:       role as string,
    });

    if (publicUserError) {
      // Best-effort cleanup: delete the auth account we just created so the
      // admin can retry without a dangling auth record.
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: publicUserError.message },
        { status: 500 }
      );
    }
  }

  // ── Guard: check for existing membership ───────────────────────────────────

  const { data: existingMembership } = await supabase
    .from("cohort_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("cohort_id", params.cohortId)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: "This person is already a member of this cohort." },
      { status: 409 }
    );
  }

  // ── Create cohort_memberships ───────────────────────────────────────────────

  const { error: membershipError } = await supabase
    .from("cohort_memberships")
    .insert({
      user_id:           userId,
      cohort_id:         params.cohortId,
      cohort_role:       role,
      invitation_status: "accepted",
      invited_at:        now,
      assigned_at:       now,
    });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  // ── Create simulation_run for participants ──────────────────────────────────
  // Only participants take the simulation; faculty do not get a run.
  // Skip if a run for this user+cohort already exists (idempotent).

  if (role === "participant" && cohort.scenario_version_id) {
    const { data: existingRun } = await supabase
      .from("simulation_runs")
      .select("id")
      .eq("user_id", userId)
      .eq("cohort_id", params.cohortId)
      .maybeSingle();

    if (!existingRun) {
      await supabase.from("simulation_runs").insert({
        user_id:             userId,
        cohort_id:           params.cohortId,
        scenario_version_id: cohort.scenario_version_id,
        status:              "not_started",
        current_round_number: 1,
        is_preview:          false,
      });
    }
  }

  // ── Respond ─────────────────────────────────────────────────────────────────

  return NextResponse.json({
    ok:      true,
    existed: !!existingPublicUser,
    ...(tempPassword ? { tempPassword } : {}),
  });
}
