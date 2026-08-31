/**
 * Loads the snapshot-derived KPI and score state for a single run.
 *
 * The state model is snapshot based: an `initial` snapshot plus one
 * `round_end` snapshot per round, with no `final` type ever written. Rounds
 * that have no snapshot yet inherit the previous round's values, so the
 * returned trajectory is always four entries long.
 *
 * Does NOT enforce auth or ownership; callers must verify the run first.
 */

import { buildInitialKPIs } from "@/engine/kpi";
import type { KPIValues, ScoreValues } from "@/engine/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface RunKpiState {
  /** round_number -> scenario_rounds.id */
  roundIdMap: Map<number, string>;
  baselineKPIs: KPIValues;
  r1KPIs: KPIValues;
  r2KPIs: KPIValues;
  finalKPIs: KPIValues;
  finalScores: ScoreValues;
  kpiTrajectory: Array<{ label: string; values: KPIValues }>;
}

export async function loadRunKpiState(
  supabase: SupabaseLike,
  runId: string,
  scenarioVersionId: string
): Promise<RunKpiState> {
  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", scenarioVersionId)
    .order("round_number");

  const roundIdMap = new Map<number, string>(
    (scenarioRounds ?? []).map(
      (r: { id: string; round_number: number }) =>
        [r.round_number, r.id] as [number, string]
    )
  );

  const roundKpiQuery = (roundNumber: number) => {
    const roundId = roundIdMap.get(roundNumber);
    if (!roundId) return Promise.resolve({ data: null });
    return supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", runId)
      .eq("scenario_round_id", roundId)
      .eq("snapshot_type", "round_end")
      .maybeSingle();
  };

  const finalScoreQuery = () => {
    const roundId = roundIdMap.get(3);
    if (!roundId) return Promise.resolve({ data: null });
    return supabase
      .from("score_snapshots")
      .select("score_values_json")
      .eq("simulation_run_id", runId)
      .eq("scenario_round_id", roundId)
      .eq("snapshot_type", "round_end")
      .maybeSingle();
  };

  const [initialRes, r1Res, r2Res, r3Res, finalScoreRes] = await Promise.all([
    supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", runId)
      .eq("snapshot_type", "initial")
      .maybeSingle(),
    roundKpiQuery(1),
    roundKpiQuery(2),
    roundKpiQuery(3),
    finalScoreQuery(),
  ]);

  const baselineKPIs = (initialRes.data?.kpi_values_json ??
    buildInitialKPIs()) as KPIValues;
  const r1KPIs = (r1Res.data?.kpi_values_json ?? baselineKPIs) as KPIValues;
  const r2KPIs = (r2Res.data?.kpi_values_json ?? r1KPIs) as KPIValues;
  const finalKPIs = (r3Res.data?.kpi_values_json ?? r2KPIs) as KPIValues;
  const finalScores = (finalScoreRes.data?.score_values_json ?? {}) as ScoreValues;

  return {
    roundIdMap,
    baselineKPIs,
    r1KPIs,
    r2KPIs,
    finalKPIs,
    finalScores,
    kpiTrajectory: [
      { label: "Baseline", values: baselineKPIs },
      { label: "Round 1", values: r1KPIs },
      { label: "Round 2", values: r2KPIs },
      { label: "Round 3", values: finalKPIs },
    ],
  };
}
