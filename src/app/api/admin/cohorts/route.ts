/**
 * POST /api/admin/cohorts
 *
 * Creates a new cohort with status = 'draft'.
 * Accepts multipart/form-data (standard HTML form POST).
 * On success: redirects (303) to /admin/cohorts/[cohortId].
 * On error: redirects back to /admin/cohorts/new.
 *
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
      headers: { Location: "/admin/cohorts/new" },
    });
  }

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const academy_start_date = formData.get("academy_start_date")?.toString() || null;
  const academy_end_date = formData.get("academy_end_date")?.toString() || null;
  const simulator_deadline = formData.get("simulator_deadline")?.toString() || null;
  const scenario_version_id = formData.get("scenario_version_id")?.toString();

  if (!name || !scenario_version_id) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/cohorts/new" },
    });
  }

  // ── Insert ──────────────────────────────────────────────────────────────────

  const { data: cohort, error } = await supabase
    .from("cohorts")
    .insert({
      name,
      description,
      academy_start_date: academy_start_date || null,
      academy_end_date: academy_end_date || null,
      simulator_deadline: simulator_deadline
        ? new Date(simulator_deadline).toISOString()
        : null,
      scenario_version_id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !cohort) {
    console.error("Failed to create cohort:", error?.message);
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/cohorts/new" },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/cohorts/${cohort.id}` },
  });
}
