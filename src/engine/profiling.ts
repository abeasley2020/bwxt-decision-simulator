/**
 * Profile Assignment Engine
 *
 * Deterministic mapping from score/KPI patterns to a PerformanceProfile.
 * Uses priority-ordered rule evaluation.
 * No side effects, no UI dependencies.
 */

import type {
  KPIValues,
  PerformanceProfile,
  PerformanceProfileKey,
  ProfileAssignmentResult,
  ProfileRule,
  ProfileRuleLogic,
  ScoreValues,
  ScoringDimensionKey,
} from "./types";

/**
 * Assign a performance profile based on final KPIs, scores, and acquired traits.
 * Rules are evaluated in priority order (lower number = higher priority).
 * First matching rule wins.
 */
export function assignPerformanceProfile(
  kpis: KPIValues,
  scores: ScoreValues,
  acquiredTraits: string[],
  profiles: PerformanceProfile[]
): ProfileAssignmentResult {
  // Build flat list of (profile, rule) pairs sorted by priority
  const candidates: Array<{ profile: PerformanceProfile; rule: ProfileRule }> = [];
  for (const profile of profiles) {
    for (const rule of profile.rules) {
      candidates.push({ profile, rule });
    }
  }
  candidates.sort((a, b) => a.rule.priorityOrder - b.rule.priorityOrder);

  for (const { profile, rule } of candidates) {
    if (ruleMatches(rule.ruleLogicJson, kpis, scores, acquiredTraits)) {
      return {
        profileKey: profile.key,
        matchedRules: [rule],
      };
    }
  }

  // Fallback: assign by highest scoring dimension
  return {
    profileKey: deriveFallbackProfile(scores),
    matchedRules: [],
  };
}

function ruleMatches(
  logic: ProfileRuleLogic,
  kpis: KPIValues,
  scores: ScoreValues,
  traits: string[]
): boolean {
  // Score thresholds: all must be met
  if (logic.scoreThresholds) {
    for (const [key, threshold] of Object.entries(logic.scoreThresholds)) {
      if ((scores[key as ScoringDimensionKey] ?? 0) < threshold) return false;
    }
  }

  // KPI thresholds: all must be met
  if (logic.kpiThresholds) {
    for (const [key, threshold] of Object.entries(logic.kpiThresholds)) {
      if ((kpis[key as keyof KPIValues] ?? 0) < threshold) return false;
    }
  }

  // Required traits: all must be present
  if (logic.requiredTraits) {
    for (const trait of logic.requiredTraits) {
      if (!traits.includes(trait)) return false;
    }
  }

  // Dominant dimensions: named dimensions must be the highest values
  if (logic.dominantDimensions && logic.dominantDimensions.length > 0) {
    const dominantKeys = new Set(logic.dominantDimensions);
    const dominantAvg =
      logic.dominantDimensions.reduce((sum, k) => sum + (scores[k] ?? 0), 0) /
      logic.dominantDimensions.length;

    const nonDominantKeys = (Object.keys(scores) as ScoringDimensionKey[]).filter(
      (k) => !dominantKeys.has(k)
    );
    const nonDominantAvg =
      nonDominantKeys.length > 0
        ? nonDominantKeys.reduce((sum, k) => sum + (scores[k] ?? 0), 0) /
          nonDominantKeys.length
        : 0;

    if (dominantAvg <= nonDominantAvg) return false;
  }

  return true;
}

function deriveFallbackProfile(scores: ScoreValues): PerformanceProfileKey {
  // Map highest scoring dimension to a fallback profile
  let topKey: ScoringDimensionKey = "enterprise_judgment";
  let topValue = -Infinity;

  for (const [key, value] of Object.entries(scores)) {
    if (value > topValue) {
      topValue = value;
      topKey = key as ScoringDimensionKey;
    }
  }

  const fallbackMap: Record<ScoringDimensionKey, PerformanceProfileKey> = {
    enterprise_judgment: "enterprise_catalyst",
    decision_velocity_with_discipline: "disciplined_accelerator",
    financial_strategic_acumen: "functional_optimizer",
    technology_data_leadership: "data_enabled_builder",
    talent_leadership: "talent_blind_spot",
    communication_alignment: "strategic_communicator",
    continuous_improvement_orientation: "cautious_operator",
  };

  return fallbackMap[topKey] ?? "cautious_operator";
}
