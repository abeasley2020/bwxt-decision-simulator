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

const MAX_RATIONALE_LENGTH = 2000;

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  props: { params: Promise<{ runId: string; roundNumber: string }> }
) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: publicUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();
  const userId = publicUser?.id ?? user.id;

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) {
    return NextResponse.json({ error: "Invalid round number" }, { status: 400 });
  }

  // Verify run ownership and state
  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, scenario_version_id")
    .eq("id", params.runId)
    .eq("user_id", userId)
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
    if (
      !Array.isArray(response.selectedOptionIds) ||
      response.selectedOptionIds.some((id) => typeof id !== "string")
    ) {
      return NextResponse.json(
        { error: `${response.decisionKey}: selectedOptionIds must be an array of strings` },
        { status: 400 }
      );
    }

    const optionKeys = new Set(template.options.map((o) => o.key));
    const unknownOption = response.selectedOptionIds.find(
      (id) => !optionKeys.has(id)
    );
    if (unknownOption) {
      return NextResponse.json(
        { error: `${response.decisionKey}: unknown option "${unknownOption}"` },
        { status: 400 }
      );
    }

    if (new Set(response.selectedOptionIds).size !== response.selectedOptionIds.length) {
      return NextResponse.json(
        { error: `${response.decisionKey}: duplicate options selected` },
        { status: 400 }
      );
    }

    if (
      response.shortRationaleText != null &&
      (typeof response.shortRationaleText !== "string" ||
        response.shortRationaleText.length > MAX_RATIONALE_LENGTH)
    ) {
      return NextResponse.json(
        {
          error: `${response.decisionKey}: rationale must be a string of at most ${MAX_RATIONALE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (response.allocationJson != null) {
      if (
        typeof response.allocationJson !== "object" ||
        Array.isArray(response.allocationJson)
      ) {
        return NextResponse.json(
          { error: `${response.decisionKey}: allocationJson must be an object` },
          { status: 400 }
        );
      }
      for (const [key, value] of Object.entries(response.allocationJson)) {
        if (!optionKeys.has(key)) {
          return NextResponse.json(
            { error: `${response.decisionKey}: unknown allocation key "${key}"` },
            { status: 400 }
          );
        }
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
          return NextResponse.json(
            {
              error: `${response.decisionKey}: allocation for "${key}" must be between 0 and 100`,
            },
            { status: 400 }
          );
        }
      }
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

  // Load this round and the previous one together. The previous round's id is
  // what pins the baseline snapshot below.
  const wantedRoundNumbers =
    roundNumber === 1 ? [1] : [roundNumber - 1, roundNumber];

  const { data: scenarioRoundRows } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .in("round_number", wantedRoundNumbers);

  const roundIdByNumber = new Map<number, string>(
    (scenarioRoundRows ?? []).map((r) => [r.round_number as number, r.id as string])
  );

  const scenarioRound = roundIdByNumber.has(roundNumber)
    ? { id: roundIdByNumber.get(roundNumber)! }
    : null;

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
    // Target round N-1's snapshot by its scenario_round id. Ordering by
    // captured_at picked whichever row had the latest client-supplied
    // timestamp, which is not necessarily the previous round.
    const prevRoundId = roundIdByNumber.get(roundNumber - 1);

    if (!prevRoundId) {
      return NextResponse.json(
        {
          error:
            "Previous round not found in database. Ensure seed.sql has been applied.",
        },
        { status: 500 }
      );
    }

    const [prevKPISnap, prevScoreSnap] = await Promise.all([
      supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", prevRoundId)
        .eq("snapshot_type", "round_end")
        .maybeSingle(),
      supabase
        .from("score_snapshots")
        .select("score_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", prevRoundId)
        .eq("snapshot_type", "round_end")
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
    console.error("Failed to save decision responses:", responseError.message);
    return NextResponse.json(
      { error: "Could not save your responses. Please try again." },
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

  // ─── Save score snapshot (round_end) ─────────────────────────────────────────

  let scoreError: { message: string } | null = null;
  if (!kpiError) {
    const scoreInsert = await supabase.from("score_snapshots").insert({
      simulation_run_id: params.runId,
      scenario_round_id: scenarioRound.id,
      snapshot_type: "round_end",
      score_values_json: effectResult.updatedScores,
      captured_at: now,
    });
    scoreError = scoreInsert.error;
  }

  // A missing snapshot is unrecoverable once the run advances: the unique
  // constraint on decision_responses blocks a resubmit, and round N+1 would
  // silently baseline off an older checkpoint, dropping this round's decisions
  // from the score. Roll the responses back so the participant can retry.
  if (kpiError || scoreError) {
    console.error(
      "Failed to save round snapshots:",
      kpiError?.message ?? scoreError?.message
    );

    const [responseRollback, kpiRollback] = await Promise.all([
      supabase
        .from("decision_responses")
        .delete()
        .eq("simulation_run_id", params.runId)
        .eq("scenario_round_id", scenarioRound.id),
      // Drop a half-written KPI snapshot too, so a retry does not leave two
      // round_end rows for the same round.
      supabase
        .from("kpi_snapshots")
        .delete()
        .eq("simulation_run_id", params.runId)
        .eq("scenario_round_id", scenarioRound.id)
        .eq("snapshot_type", "round_end"),
    ]);

    if (responseRollback.error || kpiRollback.error) {
      console.error(
        "Failed to roll back round writes after snapshot failure:",
        responseRollback.error?.message ?? kpiRollback.error?.message
      );
    }

    return NextResponse.json(
      {
        error:
          "Your round could not be saved. Please submit again, and contact your program administrator if this keeps happening.",
      },
      { status: 500 }
    );
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
