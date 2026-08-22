/**
 * POST /api/simulation/[runId]/begin
 *
 * Marks a simulation run as in_progress, records the started_at timestamp,
 * saves the participant's self-assessment, and takes an initial KPI snapshot.
 * Expects a multipart/form-data body (HTML form POST).
 * Responds with a redirect to Round 1.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInitialKPIs } from "@/engine/kpi";
import { logQueryError } from "@/lib/errors";

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve public.users.id by email — may differ from auth.users.id
  // for accounts provisioned before the invite-flow fix.
  const { data: publicUser, error: publicUserError } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  if (logQueryError("users lookup by email", publicUserError)) {
    return NextResponse.json(
      { error: "Could not load your account. Please try again." },
      { status: 500 }
    );
  }
  const userId = publicUser?.id ?? user.id;

  // Verify ownership
  const { data: run, error: runLookupError } = await supabase
    .from("simulation_runs")
    .select("id, status, user_id, scenario_version_id, cohort_id")
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (logQueryError("simulation_runs lookup", runLookupError)) {
    return NextResponse.json(
      { error: "Could not load your simulation run. Please try again." },
      { status: 500 }
    );
  }
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status !== "not_started") {
    // Already started — redirect to where they should be
    return new Response(null, {
      status: 303,
      headers: { Location: `/simulation/${run.id}/round/1` },
    });
  }

  // Read self-assessment from form data (optional, gracefully degrade if missing)
  let selfAssessment: Record<string, string | null> = {};
  try {
    const formData = await request.formData();
    selfAssessment = {
      q1_financial_confidence: formData.get("sa_q1")?.toString() ?? null,
      q2_talent_experience: formData.get("sa_q2")?.toString() ?? null,
      q3_regulatory_familiarity: formData.get("sa_q3")?.toString() ?? null,
      q4_primary_concern: formData.get("sa_q4")?.toString() ?? null,
    };
  } catch (cause) {
    // Body unreadable, continue without self-assessment
    console.error("[begin] self-assessment body unreadable:", cause);
  }

  const now = new Date().toISOString();
  const initialKPIs = buildInitialKPIs();

  // Mark run as in_progress and save self-assessment
  const { error: updateError } = await supabase
    .from("simulation_runs")
    .update({
      status: "in_progress",
      current_round_number: 1,
      started_at: now,
      last_active_at: now,
      self_assessment_json: selfAssessment,
    })
    .eq("id", run.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record initial KPI snapshot. Without it, round 1 has no baseline to
  // compare against and the results page reports the wrong net change, so
  // undo the status change and let the participant retry.
  const { error: kpiError } = await supabase.from("kpi_snapshots").insert({
    simulation_run_id: run.id,
    snapshot_type: "initial",
    kpi_values_json: initialKPIs,
    captured_at: now,
  });

  if (kpiError) {
    logQueryError("initial kpi_snapshots insert", kpiError);

    const { error: revertError } = await supabase
      .from("simulation_runs")
      .update({ status: "not_started", started_at: null })
      .eq("id", run.id);
    logQueryError("simulation_runs revert to not_started", revertError);

    return NextResponse.json(
      { error: "Could not start the simulation. Please try again." },
      { status: 500 }
    );
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `/simulation/${run.id}/round/1` },
  });
}
