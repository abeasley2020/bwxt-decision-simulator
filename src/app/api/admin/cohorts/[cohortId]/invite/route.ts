/**
 * POST /api/admin/cohorts/[cohortId]/invite
 *
 * Invites a user to a cohort as a participant or faculty member.
 *
 * Logic:
 *  1. If a user with the given email exists in the `users` table:
 *     - Upsert into `cohort_memberships` with invitation_status = 'accepted'.
 *     - Returns { ok: true, existed: true }
 *  2. If no user exists:
 *     - Insert a record into `invitations` (no email is sent in MVP).
 *     - Returns { ok: true, existed: false }
 *
 * Accepts JSON body: { email: string, role: "participant" | "faculty" }
 *
 * Auth: admin role required.
 *
 * Constraint: The `invitations` table has no `role` column. For non-existing
 * users, the invitation records their email and cohort only; the role must be
 * assigned when they are manually added later (MVP limitation).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role !== "admin") {
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
  const role = body.role;

  if (!email || !["participant", "faculty"].includes(role ?? "")) {
    return NextResponse.json(
      { error: "Valid email and role ('participant' or 'faculty') are required." },
      { status: 400 }
    );
  }

  // ── Check if cohort exists ────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  // ── Check if user exists ─────────────────────────────────────────────────

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    // User exists — add directly to cohort_memberships
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("cohort_memberships")
      .upsert(
        {
          user_id: existingUser.id,
          cohort_id: params.cohortId,
          cohort_role: role,
          invitation_status: "accepted",
          invited_at: now,
          assigned_at: now,
        },
        {
          onConflict: "user_id,cohort_id",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, existed: true });
  }

  // User does not exist — write to invitations table (no email sent in MVP)
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  ).toISOString();

  const { error } = await supabase.from("invitations").insert({
    email,
    token,
    cohort_id: params.cohortId,
    status: "pending",
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, existed: false });
}
