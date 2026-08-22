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
import { logQueryError } from "@/lib/errors";

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

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) {
    return NextResponse.json({ error: "Invalid round number" }, { status: 400 });
  }

  // Verify run ownership and state
  const { data: run, error: runError } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, scenario_version_id")
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (logQueryError("simulation_runs lookup", runError)) {
    return NextResponse.json(
      { error: "Could not load your simulation run. Please try again." },
      { status: 500 }
    );
  }
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

  const { data: scenarioRound, error: scenarioRoundError } = await supabase
    .from("scenario_rounds")
    .select("id")
    .eq("scenario_version_id", run.scenario_version_id)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (logQueryError("scenario_rounds lookup", scenarioRoundError)) {
    return NextResponse.json(
      { error: "Could not load the scenario for this round. Please try again." },
      { status: 500 }
    );
  }
  if (!scenarioRound) {
    return NextResponse.json(
      {
        error:
          "Scenario round not found in database. Ensure seed.sql has been applied.",
      },
      { status: 500 }
    );
  }

  const { data: dbTemplates, error: dbTemplatesError } = await supabase
    .from("decision_templates")
    .select("id, key")
    .eq("scenario_round_id", scenarioRound.id);

  if (logQueryError("decision_templates lookup", dbTemplatesError)) {
    return NextResponse.json(
      { error: "Could not load decision templates. Please try again." },
      { status: 500 }
    );
  }

  const templateIdMap = new Map(
    (dbTemplates ?? []).map((t) => [t.key, t.id])
  );

  const unmappedDecision = body.responses.find(
    (r) => !templateIdMap.has(r.decisionKey)
  );
  if (unmappedDecision) {
    return NextResponse.json(
      {
        error: `Decision "${unmappedDecision.decisionKey}" is missing from the database. Ensure seed.sql has been applied.`,
      },
      { status: 500 }
    );
  }

  // ─── Load baseline KPIs and scores ───────────────────────────────────────────
  // Round 1: start from initial snapshot.
  // Round N > 1: start from the previous round's end-state so effects accumulate.

  let baselineKPIs: KPIValues;
  let baselineScores: ScoreValues;

  if (roundNumber === 1) {
    const { data: initialSnapshot, error: initialSnapshotError } = await supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", run.id)
      .eq("snapshot_type", "initial")
      .maybeSingle();

    if (logQueryError("initial kpi_snapshots lookup", initialSnapshotError)) {
      return NextResponse.json(
        { error: "Could not load your starting KPIs. Please try again." },
        { status: 500 }
      );
    }
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

    // A failed baseline read would silently reset the run to starting values
    // and corrupt every later round, so refuse rather than guess.
    if (
      logQueryError("previous kpi_snapshots lookup", prevKPISnap.error) ||
      logQueryError("previous score_snapshots lookup", prevScoreSnap.error)
    ) {
      return NextResponse.json(
        { error: "Could not load your previous round results. Please try again." },
        { status: 500 }
      );
    }
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

  // The four writes below are not transactional. If a later one fails, the
  // earlier rows are removed so the participant can resubmit the round
  // instead of continuing from a half-written state.
  const rollbackRound = async () => {
    const { error } = await supabase
      .from("decision_responses")
      .delete()
      .eq("simulation_run_id", params.runId)
      .eq("scenario_round_id", scenarioRound.id);
    logQueryError("decision_responses rollback", error);

    const { error: kpiRollbackError } = await supabase
      .from("kpi_snapshots")
      .delete()
      .eq("simulation_run_id", params.runId)
      .eq("scenario_round_id", scenarioRound.id)
      .eq("snapshot_type", "round_end");
    logQueryError("kpi_snapshots rollback", kpiRollbackError);

    const { error: scoreRollbackError } = await supabase
      .from("score_snapshots")
      .delete()
      .eq("simulation_run_id", params.runId)
      .eq("scenario_round_id", scenarioRound.id)
      .eq("snapshot_type", "round_end");
    logQueryError("score_snapshots rollback", scoreRollbackError);
  };

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
    logQueryError("kpi_snapshots insert", kpiError);
    await rollbackRound();
    return NextResponse.json(
      { error: "Could not save your round results. Please submit again." },
      { status: 500 }
    );
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
    logQueryError("score_snapshots insert", scoreError);
    await rollbackRound();
    return NextResponse.json(
      { error: "Could not save your round results. Please submit again." },
      { status: 500 }
    );
  }

  // ─── Advance simulation run ──────────────────────────────────────────────────

  const { error: advanceError } = await supabase
    .from("simulation_runs")
    .update({
      current_round_number: roundNumber + 1,
      last_active_at: now,
    })
    .eq("id", params.runId);

  if (advanceError) {
    logQueryError("simulation_runs advance", advanceError);
    await rollbackRound();
    return NextResponse.json(
      { error: "Could not advance to the next round. Please submit again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    redirectTo: `/simulation/${params.runId}/round/${roundNumber}/consequence`,
  });
}
