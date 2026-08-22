/**
 * Loads a run's stored decision responses and replays them through the
 * engine to reconstruct the hidden traits the participant acquired.
 *
 * Traits are computed during round submission (applyRoundResponses) but
 * never persisted, so pages that assign a performance profile must call
 * this before invoking assignPerformanceProfile. Mirrors the query
 * pattern used by loadReportData: responses are keyed back to content
 * decision keys via decision_templates, and to round numbers via
 * scenario_rounds.
 *
 * Does NOT enforce auth — callers must verify run ownership first.
 * Returns [] when the run has no responses yet.
 *
 * Throws DataAccessError when a query fails. A failed read is not the same as
 * "no responses": swallowing it would assign, and permanently persist, a
 * profile derived from an empty decision history.
 */

import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import { deriveAcquiredTraits } from "@/engine/effects";
import { buildInitialKPIs } from "@/engine/kpi";
import { buildInitialScores } from "@/engine/scoring";
import type { DecisionResponse } from "@/engine/types";
import { throwOnQueryError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function loadAcquiredTraits(
  supabase: SupabaseLike,
  runId: string,
  scenarioVersionId: string
): Promise<string[]> {
  const { data: scenarioRounds, error: scenarioRoundsError } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", scenarioVersionId);

  throwOnQueryError("scenario_rounds lookup", scenarioRoundsError);

  const roundIdToNumber = new Map<string, number>(
    (scenarioRounds ?? []).map(
      (r: { id: string; round_number: number }) =>
        [r.id, r.round_number] as [string, number]
    )
  );

  const [templateRowsRes, responsesRes] = await Promise.all([
    supabase
      .from("decision_templates")
      .select("id, key")
      .in(
        "scenario_round_id",
        (scenarioRounds ?? []).map((r: { id: string }) => r.id)
      ),
    supabase
      .from("decision_responses")
      .select(
        "decision_template_id, scenario_round_id, selected_option_ids_json, allocation_json, responded_at"
      )
      .eq("simulation_run_id", runId)
      .order("responded_at"),
  ]);

  throwOnQueryError("decision_templates lookup", templateRowsRes.error);
  throwOnQueryError("decision_responses lookup", responsesRes.error);

  const templateIdToKey = new Map<string, string>(
    (templateRowsRes.data ?? []).map(
      (t: { id: string; key: string }) => [t.id, t.key] as [string, string]
    )
  );

  const engineResponses: DecisionResponse[] = (responsesRes.data ?? [])
    .map(
      (resp: {
        decision_template_id: string;
        scenario_round_id: string;
        selected_option_ids_json: string[];
        allocation_json: Record<string, number> | null;
        responded_at: string;
      }): DecisionResponse | null => {
        const decisionKey = templateIdToKey.get(resp.decision_template_id);
        const roundNumber = roundIdToNumber.get(resp.scenario_round_id);
        if (!decisionKey || roundNumber === undefined) return null;
        return {
          simulationRunId: runId,
          roundNumber,
          decisionKey,
          selectedOptionIds: resp.selected_option_ids_json ?? [],
          allocationJson: resp.allocation_json ?? undefined,
          respondedAt: resp.responded_at,
        };
      }
    )
    .filter((r: DecisionResponse | null): r is DecisionResponse => r !== null);

  return deriveAcquiredTraits(
    engineResponses,
    IRON_HORIZON_VERSION.rounds,
    buildInitialKPIs(),
    buildInitialScores()
  );
}
