/**
 * POST /api/admin/cohorts/[cohortId]
 *
 * Updates an existing cohort's editable fields.
 * Accepts multipart/form-data (standard HTML form POST from the edit page).
 * On success: redirects (303) to /admin/cohorts/[cohortId].
 * On error: redirects back to the edit page.
 *
 * Auth: admin role required.
 *
 * Note: HTML forms only support GET and POST; this endpoint handles the
 * update via POST. Status changes via the inline controls use the separate
 * /api/admin/cohorts/[cohortId]/status endpoint (JSON).
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

  // ── Parse form ──────────────────────────────────────────────────────────────

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/cohorts/${params.cohortId}/edit` },
    });
  }

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const academy_start_date = formData.get("academy_start_date")?.toString() || null;
  const academy_end_date = formData.get("academy_end_date")?.toString() || null;
  const simulator_deadline = formData.get("simulator_deadline")?.toString() || null;
  const statusValue = formData.get("status")?.toString();

  if (!name) {
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/cohorts/${params.cohortId}/edit` },
    });
  }

  const validStatuses = ["draft", "active", "closed"];

  const updateData: Record<string, unknown> = {
    name,
    description,
    academy_start_date: academy_start_date || null,
    academy_end_date: academy_end_date || null,
    simulator_deadline: simulator_deadline
      ? new Date(simulator_deadline).toISOString()
      : null,
  };

  if (statusValue && validStatuses.includes(statusValue)) {
    updateData.status = statusValue;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  const { error } = await supabase
    .from("cohorts")
    .update(updateData)
    .eq("id", params.cohortId);

  if (error) {
    console.error("Failed to update cohort:", error.message);
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/cohorts/${params.cohortId}/edit` },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/cohorts/${params.cohortId}` },
  });
}
