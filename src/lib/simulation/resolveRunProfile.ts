/**
 * Assign-or-read a run's performance profile.
 *
 * Shared by /results, /dashboard, /complete and the printed report so all
 * four agree on the assigned profile. The printed report previously only read
 * an already-persisted `final_profile_id`, so a run whose profile had never
 * been assigned printed a blank profile while /results showed one.
 *
 * Behaviour:
 *  - If `final_profile_id` is already set, look up its key and stop.
 *  - Otherwise, only assign when the final scores were genuinely loaded.
 *    An empty score set reads as all-zero dimensions and matches ceiling
 *    rules, which would permanently brand the participant on a failed read.
 *  - Hidden traits are never persisted, so stored decision_responses are
 *    replayed through the engine to reconstruct them before matching.
 *  - DB profile rules win; the authored content rules are the fallback for an
 *    unseeded database (in which case nothing is persisted).
 *
 * Does NOT enforce auth or ownership. Callers must verify access first.
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

export interface ResolveRunProfileRun {
  id: string;
  scenario_version_id: string;
  final_profile_id: string | null;
}

export interface ResolveRunProfileInput {
  finalKPIs: KPIValues;
  finalScores: ScoreValues;
  finalScoresAvailable: boolean;
}

interface DBProfileRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  strengths_text: string | null;
  blind_spots_text: string | null;
}

interface DBProfileRuleRow {
  performance_profile_id: string;
  priority_order: number;
  rule_logic_json: ProfileRuleLogic;
}

export async function resolveRunProfile(
  supabase: SupabaseLike,
  run: ResolveRunProfileRun,
  input: ResolveRunProfileInput
): Promise<PerformanceProfileKey | null> {
  const [dbProfilesRes, dbRulesRes] = await Promise.all([
    supabase
      .from("performance_profiles")
      .select("id, key, label, description, strengths_text, blind_spots_text"),
    supabase
      .from("profile_rules")
      .select("performance_profile_id, priority_order, rule_logic_json"),
  ]);

  const dbProfiles: DBProfileRow[] = dbProfilesRes.data ?? [];
  const dbRules: DBProfileRuleRow[] = dbRulesRes.data ?? [];

  if (run.final_profile_id) {
    const match = dbProfiles.find((p) => p.id === run.final_profile_id);
    return (match?.key as PerformanceProfileKey) ?? null;
  }

  if (!input.finalScoresAvailable) return null;

  // Hidden traits are not persisted; replay stored responses to rebuild them
  // so trait-gated profile rules can match.
  const acquiredTraits = await loadAcquiredTraits(
    supabase,
    run.id,
    run.scenario_version_id
  );

  if (dbProfiles.length === 0) {
    // Database not seeded: fall back to the authored content rules and do not
    // persist an assignment derived from a different rule set.
    const fallback = assignPerformanceProfile(
      input.finalKPIs,
      input.finalScores,
      acquiredTraits,
      PERFORMANCE_PROFILES
    );
    return fallback.profileKey;
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

  const result = assignPerformanceProfile(
    input.finalKPIs,
    input.finalScores,
    acquiredTraits,
    engineProfiles
  );

  const matched = dbProfiles.find((p) => p.key === result.profileKey);
  if (matched) {
    const { error } = await supabase
      .from("simulation_runs")
      .update({
        final_profile_id: matched.id,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (error) {
      console.error("resolveRunProfile: failed to persist profile", error);
    }
  }

  return result.profileKey;
}
