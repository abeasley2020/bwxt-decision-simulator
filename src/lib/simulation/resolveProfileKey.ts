/**
 * Resolves (and persists on first resolution) a run's performance profile.
 *
 * If `final_profile_id` is already set the stored profile key is returned
 * unchanged. Otherwise the engine assigns a profile from the DB rule set,
 * falling back to the content rule set when `performance_profiles` is
 * unseeded, and the result is written back to `simulation_runs` so later
 * views short-circuit.
 *
 * Hidden traits are never persisted, so stored decision responses are
 * replayed to reconstruct them before assignment.
 *
 * Does NOT enforce auth or ownership; callers must verify the run first.
 */

import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { assignPerformanceProfile } from "@/engine/profiling";
import { loadAcquiredTraits } from "@/lib/simulation/loadAcquiredTraits";
import type {
  KPIValues,
  PerformanceProfile,
  PerformanceProfileKey,
  ProfileRuleLogic,
  ScoreValues,
} from "@/engine/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

interface DbProfileRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  strengths_text: string | null;
  blind_spots_text: string | null;
}

interface DbRuleRow {
  performance_profile_id: string;
  priority_order: number;
  rule_logic_json: ProfileRuleLogic;
}

export const PROFILE_SELECT =
  "id, key, label, description, strengths_text, blind_spots_text";
export const PROFILE_RULE_SELECT =
  "performance_profile_id, priority_order, rule_logic_json";

interface ResolveArgs {
  run: {
    id: string;
    scenario_version_id: string;
    final_profile_id: string | null;
  };
  finalKPIs: KPIValues;
  finalScores: ScoreValues;
  dbProfiles: DbProfileRow[];
  dbRules: DbRuleRow[];
}

export async function resolveProfileKey(
  supabase: SupabaseLike,
  { run, finalKPIs, finalScores, dbProfiles, dbRules }: ResolveArgs
): Promise<PerformanceProfileKey | null> {
  if (run.final_profile_id) {
    const match = dbProfiles.find((p) => p.id === run.final_profile_id);
    return (match?.key as PerformanceProfileKey) ?? null;
  }

  const acquiredTraits = await loadAcquiredTraits(
    supabase,
    run.id,
    run.scenario_version_id
  );

  if (dbProfiles.length === 0) {
    // DB is unseeded: fall back to the content rule set, nothing to persist
    return assignPerformanceProfile(
      finalKPIs,
      finalScores,
      acquiredTraits,
      PERFORMANCE_PROFILES
    ).profileKey;
  }

  const engineProfiles: PerformanceProfile[] = dbProfiles.map((p) => ({
    key: p.key as PerformanceProfileKey,
    label: p.label,
    description: p.description ?? "",
    strengthsText: p.strengths_text ?? "",
    blindSpotsText: p.blind_spots_text ?? "",
    rules: dbRules
      .filter((r) => r.performance_profile_id === p.id)
      .map((r) => ({
        priorityOrder: r.priority_order,
        ruleLogicJson: r.rule_logic_json,
      })),
  }));

  const { profileKey } = assignPerformanceProfile(
    finalKPIs,
    finalScores,
    acquiredTraits,
    engineProfiles
  );

  const matched = dbProfiles.find((p) => p.key === profileKey);
  if (matched) {
    await supabase
      .from("simulation_runs")
      .update({
        final_profile_id: matched.id,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", run.id);
  }

  return profileKey;
}

/** Content-authored profile used for display copy, given an assigned key. */
export function displayProfile(
  key: PerformanceProfileKey | null
): PerformanceProfile | null {
  return PERFORMANCE_PROFILES.find((p) => p.key === key) ?? null;
}
