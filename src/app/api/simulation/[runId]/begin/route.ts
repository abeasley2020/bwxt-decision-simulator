/**
 * POST /api/simulation/[runId]/begin
 * Marks a simulation run as in_progress, records started_at, takes initial KPI snapshot.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInitialKPIs } from "@/engine/kpi";
import { buildInitialScores } from "@/engine/scoring";

export async function POST(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, user_id, scenario_version_id, cohort_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status !== "not_started") {
    return NextResponse.json(
      { error: "Simulation already started" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const initialKPIs = buildInitialKPIs();
  const initialScores = buildInitialScores();

  // Mark run as in_progress
  const { error: updateError } = await supabase
    .from("simulation_runs")
    .update({
      status: "in_progress",
      current_round_number: 1,
      started_at: now,
      last_active_at: now,
    })
    .eq("id", run.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record initial KPI snapshot
  const { error: kpiError } = await supabase.from("kpi_snapshots").insert({
    simulation_run_id: run.id,
    snapshot_type: "initial",
    kpi_values_json: initialKPIs,
    captured_at: now,
  });

  if (kpiError) {
    console.error("Failed to insert initial KPI snapshot:", kpiError.message);
  }

  // Redirect to Round 1
  return NextResponse.redirect(
    new URL(`/simulation/${run.id}/round/1`, process.env.NEXT_PUBLIC_APP_URL ?? "")
  );
}
