/**
 * Single source of truth for a run's KPI and score snapshots.
 *
 * Four surfaces (results, dashboard, completion, printed report) each used to
 * load these independently and each fell back to a different substitute when
 * the round-3 snapshot was missing: round 2, the baseline, or the hardcoded
 * initial KPIs. All four labelled the result "final", so the same run could
 * show three different sets of "final" numbers.
 *
 * This loader checks the error field on every query and returns a
 * discriminated result. When the final snapshot is genuinely absent the
 * caller must render an explicit unavailable state; it must never substitute
 * another checkpoint's numbers.
 *
 * Snapshot model (see CLAUDE.md): `initial` then one `round_end` per round.
 * No `final` snapshot type is ever written; final values are round 3's
 * `round_end`.
 *
 * Does NOT enforce auth or ownership. Callers must verify access first.
 */

import { buildInitialKPIs } from "@/engine/kpi";
import type { KPIValues, ScoreValues } from "@/engine/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type SnapshotUnavailableReason =
  | "scenario_rounds_unavailable"
  | "snapshot_query_failed"
  | "final_kpi_snapshot_missing";

export interface RunSnapshotSet {
  /** Simulation start values: the `initial` snapshot. */
  baseline: KPIValues;
  /** Round 1 `round_end`, or null when that round has no snapshot. */
  r1: KPIValues | null;
  /** Round 2 `round_end`, or null when that round has no snapshot. */
  r2: KPIValues | null;
  /** Round 3 `round_end`. Always present when ok is true. */
  final: KPIValues;
  /** Round 3 score `round_end`. Empty object when unavailable. */
  finalScores: ScoreValues;
  /**
   * False when the round-3 score snapshot could not be read. An empty score
   * set reads as all-zero dimensions and matches ceiling-style profile rules,
   * so profile assignment must be gated on this.
   */
  finalScoresAvailable: boolean;
}

export type LoadRunSnapshotsResult =
  | ({ ok: true } & RunSnapshotSet)
  | { ok: false; reason: SnapshotUnavailableReason };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasError(res: any): boolean {
  return Boolean(res && typeof res === "object" && "error" in res && res.error);
}

export async function loadRunSnapshots(
  supabase: SupabaseLike,
  runId: string,
  scenarioVersionId: string
): Promise<LoadRunSnapshotsResult> {
  const scenarioRoundsRes = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", scenarioVersionId)
    .order("round_number");

  if (hasError(scenarioRoundsRes)) {
    console.error(
      "loadRunSnapshots: scenario_rounds query failed",
      scenarioRoundsRes.error
    );
    return { ok: false, reason: "scenario_rounds_unavailable" };
  }

  const roundIdMap = new Map<number, string>(
    (scenarioRoundsRes.data ?? []).map(
      (r: { id: string; round_number: number }) =>
        [r.round_number, r.id] as [number, string]
    )
  );

  const round3Id = roundIdMap.get(3);
  if (!round3Id) {
    return { ok: false, reason: "scenario_rounds_unavailable" };
  }

  const roundEndKpiQuery = (roundNumber: number) => {
    const roundId = roundIdMap.get(roundNumber);
    if (!roundId) return Promise.resolve({ data: null, error: null });
    return supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", runId)
      .eq("scenario_round_id", roundId)
      .eq("snapshot_type", "round_end")
      .maybeSingle();
  };

  const [initialRes, r1Res, r2Res, r3Res, scoreRes] = await Promise.all([
    supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", runId)
      .eq("snapshot_type", "initial")
      .maybeSingle(),
    roundEndKpiQuery(1),
    roundEndKpiQuery(2),
    roundEndKpiQuery(3),
    supabase
      .from("score_snapshots")
      .select("score_values_json")
      .eq("simulation_run_id", runId)
      .eq("scenario_round_id", round3Id)
      .eq("snapshot_type", "round_end")
      .maybeSingle(),
  ]);

  for (const res of [initialRes, r1Res, r2Res, r3Res]) {
    if (hasError(res)) {
      console.error("loadRunSnapshots: kpi_snapshots query failed", res.error);
      return { ok: false, reason: "snapshot_query_failed" };
    }
  }

  const finalValues = r3Res.data?.kpi_values_json as KPIValues | undefined;
  if (!finalValues) {
    return { ok: false, reason: "final_kpi_snapshot_missing" };
  }

  const finalScores = (scoreRes.data?.score_values_json ?? {}) as ScoreValues;
  const finalScoresAvailable =
    !hasError(scoreRes) &&
    scoreRes.data?.score_values_json != null &&
    Object.keys(finalScores).length > 0;

  return {
    ok: true,
    baseline: (initialRes.data?.kpi_values_json ??
      buildInitialKPIs()) as KPIValues,
    r1: (r1Res.data?.kpi_values_json ?? null) as KPIValues | null,
    r2: (r2Res.data?.kpi_values_json ?? null) as KPIValues | null,
    final: finalValues,
    finalScores,
    finalScoresAvailable,
  };
}
