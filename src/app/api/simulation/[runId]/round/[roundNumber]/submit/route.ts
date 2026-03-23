/**
 * POST /api/simulation/[runId]/round/[roundNumber]/submit
 *
 * Receives a participant's round responses, validates them against the
 * scenario content, persists to decision_responses, applies the simulation
 * engine to compute KPI and score changes, saves snapshots, and advances
 * the run's current_round_number.
 *
 * Returns JSON: { redirectTo: string }
 * The client is responsible for navigating to the redirectTo URL.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import {
  applyRoundResponses,
} from "@/engine/effects";
import { buildInitialKPIs } from "@/engine/kpi";
import { buildInitialScores } from "@/engine/scoring";
import type { DecisionResponse, KPIValues, ScoreValues } from "@/engine/types";

// ─── Request body shape ────────────────────────────────────────────────────────

interface SubmitResponseItem {
  decisionKey: string;
  selectedOptionIds: string[];
  allocationJson?: Record<string, number> | null;
  shortRationaleText?: string | null;
}

interface SubmitRequestBody {
  responses: SubmitResponseItem[];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { runId: string; roundNumber: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) {
    return NextResponse.json({ error: "Invalid round number" }, { status: 400 });
  }

  // Verify run ownership and state
  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, scenario_version_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (run.status !== "in_progress") {
    return NextResponse.json(
      { error: "Simulation is not in progress" },
      { status: 400 }
    );
  }
  if (run.current_round_number !== roundNumber) {
    return NextResponse.json(
      {
        error: `Expected round ${run.current_round_number}, got ${roundNumber}`,
      },
      { status: 400 }
    );
  }

  // Parse request body
  let body: SubmitRequestBody;
  try {
    body = (await request.json()) as SubmitRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.responses)) {
    return NextResponse.json(
      { error: "responses must be an array" },
      { status: 400 }
    );
  }

  // Load round content from authored scenario
  const round = IRON_HORIZON_VERSION.rounds.find(
    (r) => r.roundNumber === roundNumber
  );
  if (!round) {
    return NextResponse.json({ error: "Round content not found" }, { status: 500 });
  }

  const templateMap = new Map(round.decisions.map((d) => [d.key, d]));

  // ─── Server-side validation ─────────────────────────────────────────────────

  // Check all required decisions are present
  for (const template of round.decisions) {
    if (!template.isRequired) continue;
    const found = body.responses.find((r) => r.decisionKey === template.key);
    if (!found) {
      return NextResponse.json(
        { error: `Required decision missing: ${template.key}` },
        { status: 400 }
      );
    }
  }

  // Validate each response
  for (const response of body.responses) {
    const template = templateMap.get(response.decisionKey);
    if (!template) {
      return NextResponse.json(
        { error: `Unknown decision key: ${response.decisionKey}` },
        { status: 400 }
      );
    }
    if (!template.isRequired) continue;

    if (template.decisionType === "single_select") {
      if (response.selectedOptionIds.length !== 1) {
        return NextResponse.json(
          {
            error: `${response.decisionKey}: exactly one option must be selected`,
          },
          { status: 400 }
        );
      }
    }

    if (template.decisionType === "multi_select") {
      const min = template.minChoices ?? 1;
      const max = template.maxChoices ?? template.options.length;
      const count = response.selectedOptionIds.length;
      if (count < min || count > max) {
        return NextResponse.json(
          {
            error: `${response.decisionKey}: select ${min}–${max} options (got ${count})`,
          },
          { status: 400 }
        );
      }
    }

    if (template.decisionType === "resource_allocation") {
      const alloc = response.allocationJson ?? {};
      const total = Object.values(alloc).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0
      );
      if (Math.abs(total - 100) > 1) {
        return NextResponse.json(
          {
            error: `${response.decisionKey}: allocation must total 100% (got ${total}%)`,
          },
          { status: 400 }
        );
      }
    }
  }

  // ─── Look up DB IDs ─────────────────────────────────────────────────────────

  const { data: scenarioRound } = await supabase
    .from("scenario_rounds")
    .select("id")
    .eq("scenario_version_id", run.scenario_version_id)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (!scenarioRound) {
    return NextResponse.json(
      {
        error:
          "Scenario round not found in database. Ensure seed.sql has been applied.",
      },
      { status: 500 }
    );
  }

  const { data: dbTemplates } = await supabase
    .from("decision_templates")
    .select("id, key")
    .eq("scenario_round_id", scenarioRound.id);

  const templateIdMap = new Map(
    (dbTemplates ?? []).map((t) => [t.key, t.id])
  );

  // ─── Load baseline KPIs and scores ───────────────────────────────────────────
  // Round 1: start from initial snapshot.
  // Round N > 1: start from the previous round's end-state so effects accumulate.

  let baselineKPIs: KPIValues;
  let baselineScores: ScoreValues;

  if (roundNumber === 1) {
    const { data: initialSnapshot } = await supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", run.id)
      .eq("snapshot_type", "initial")
      .maybeSingle();
    baselineKPIs = (initialSnapshot?.kpi_values_json ?? buildInitialKPIs()) as KPIValues;
    baselineScores = buildInitialScores();
  } else {
    const [prevKPISnap, prevScoreSnap] = await Promise.all([
      supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("snapshot_type", "round_end")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("score_snapshots")
        .select("score_values_json")
        .eq("simulation_run_id", run.id)
        .eq("snapshot_type", "round_end")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    baselineKPIs = (prevKPISnap.data?.kpi_values_json ?? buildInitialKPIs()) as KPIValues;
    baselineScores = (prevScoreSnap.data?.score_values_json ?? buildInitialScores()) as ScoreValues;
  }

  // ─── Apply engine effects ────────────────────────────────────────────────────

  const engineResponses: DecisionResponse[] = body.responses.map((r) => ({
    simulationRunId: params.runId,
    roundNumber,
    decisionKey: r.decisionKey,
    selectedOptionIds: r.selectedOptionIds,
    allocationJson: r.allocationJson ?? undefined,
    respondedAt: new Date().toISOString(),
  }));

  const effectResult = applyRoundResponses(
    engineResponses,
    round.decisions,
    baselineKPIs,
    baselineScores
  );

  const now = new Date().toISOString();

  // ─── Persist decision responses ──────────────────────────────────────────────

  const responseRows = body.responses.map((r) => ({
    simulation_run_id: params.runId,
    scenario_round_id: scenarioRound.id,
    decision_template_id: templateIdMap.get(r.decisionKey),
    selected_option_ids_json: r.selectedOptionIds,
    short_rationale_text: r.shortRationaleText ?? null,
    allocation_json: r.allocationJson ?? null,
    responded_at: now,
  }));

  const { error: responseError } = await supabase
    .from("decision_responses")
    .insert(responseRows);

  if (responseError) {
    if (responseError.code === "23505") {
      return NextResponse.json(
        { error: "This round has already been submitted." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: responseError.message },
      { status: 500 }
    );
  }

  // ─── Save KPI snapshot (round_end) ───────────────────────────────────────────

  const { error: kpiError } = await supabase.from("kpi_snapshots").insert({
    simulation_run_id: params.runId,
    scenario_round_id: scenarioRound.id,
    snapshot_type: "round_end",
    kpi_values_json: effectResult.updatedKPIs,
    captured_at: now,
  });

  if (kpiError) {
    console.error("Failed to save KPI snapshot:", kpiError.message);
  }

  // ─── Save score snapshot (round_end) ─────────────────────────────────────────

  const { error: scoreError } = await supabase.from("score_snapshots").insert({
    simulation_run_id: params.runId,
    scenario_round_id: scenarioRound.id,
    snapshot_type: "round_end",
    score_values_json: effectResult.updatedScores,
    captured_at: now,
  });

  if (scoreError) {
    console.error("Failed to save score snapshot:", scoreError.message);
  }

  // ─── Advance simulation run ──────────────────────────────────────────────────

  await supabase
    .from("simulation_runs")
    .update({
      current_round_number: roundNumber + 1,
      last_active_at: now,
    })
    .eq("id", params.runId);

  return NextResponse.json({
    redirectTo: `/simulation/${params.runId}/round/${roundNumber}/consequence`,
  });
}
