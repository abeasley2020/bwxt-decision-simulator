/**
 * POST /api/admin/cohorts/[cohortId]/invite
 *
 * Adds a user to a cohort as a participant or faculty member.
 *
 * Logic:
 *  1. If a user with the given email exists in `users`:
 *     - Check they are not already a member (409 if so).
 *     - Insert into `cohort_memberships` with invitation_status = 'accepted'.
 *     - Returns { ok: true, existed: true }
 *  2. If no user exists:
 *     - Create a `users` row (email + role, empty names as placeholders).
 *     - Insert into `cohort_memberships` with invitation_status = 'pending'.
 *     - Returns { ok: true, existed: false }
 *     - Note: the new user cannot log in until a Supabase auth account is created
 *       for their email and the public.users.id is aligned (MVP limitation).
 *
 * Accepts JSON body: { email: string, role: "participant" | "faculty" }
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const supabase = createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────

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

  // ── Parse body ────────────────────────────────────────────────────────────

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.toString().trim().toLowerCase();
  const role = body.role;

  if (!email || !["participant", "faculty"].includes(role ?? "")) {
    return NextResponse.json(
      { error: "Valid email and role ('participant' or 'faculty') are required." },
      { status: 400 }
    );
  }

  // ── Check cohort exists ───────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found." }, { status: 404 });
  }

  // ── Check if user exists ──────────────────────────────────────────────────

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingUser) {
    // ── Check they are not already a member ────────────────────────────────

    const { data: existingMembership } = await supabase
      .from("cohort_memberships")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("cohort_id", params.cohortId)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json(
        { error: "This person is already a member of this cohort." },
        { status: 409 }
      );
    }

    // ── Add to cohort ──────────────────────────────────────────────────────

    const { error } = await supabase.from("cohort_memberships").insert({
      user_id: existingUser.id,
      cohort_id: params.cohortId,
      cohort_role: role,
      invitation_status: "accepted",
      invited_at: now,
      assigned_at: now,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, existed: true });
  }

  // ── User does not exist — create user record then add to cohort ───────────

  const { data: newUser, error: createUserError } = await supabase
    .from("users")
    .insert({
      email,
      first_name: "",
      last_name: "",
      role: role as string,
    })
    .select("id")
    .single();

  if (createUserError) {
    // Handle duplicate email race condition
    if (createUserError.code === "23505") {
      return NextResponse.json(
        { error: "A user with this email was just created. Please try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createUserError.message }, { status: 500 });
  }

  const { error: membershipError } = await supabase
    .from("cohort_memberships")
    .insert({
      user_id: newUser.id,
      cohort_id: params.cohortId,
      cohort_role: role,
      invitation_status: "pending",
      invited_at: now,
    });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, existed: false });
}
