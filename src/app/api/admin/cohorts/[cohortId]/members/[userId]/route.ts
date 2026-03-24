/**
 * DELETE /api/admin/cohorts/[cohortId]/members/[userId]
 *
 * Removes a user from a cohort by deleting their cohort_memberships row.
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { cohortId: string; userId: string } }
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

  // ── Delete membership ─────────────────────────────────────────────────────

  const { error } = await supabase
    .from("cohort_memberships")
    .delete()
    .eq("user_id", params.userId)
    .eq("cohort_id", params.cohortId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
