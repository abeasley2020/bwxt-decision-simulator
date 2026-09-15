/**
 * DELETE /api/admin/cohorts/[cohortId]/members/[userId]
 *
 * Removes a user from a cohort by deleting their cohort_memberships row.
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicUser } from "@/lib/auth/resolvePublicUser";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ cohortId: string; userId: string }> }
) {
  const params = await props.params;
  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve public.users by email first: auth.users.id and public.users.id
  // differ for legacy accounts, so an id-only lookup 403s a real admin.
  const viewer = await resolvePublicUser(supabase, user);

  if (!viewer || viewer.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Delete membership ─────────────────────────────────────────────────────

  const { error } = await supabase
    .from("cohort_memberships")
    .delete()
    .eq("user_id", params.userId)
    .eq("cohort_id", params.cohortId);

  if (error) {
    console.error("Supabase write failed:", error.message);
    return NextResponse.json(
      { error: "The change could not be saved. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
