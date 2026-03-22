/**
 * Cohort Analytics
 *
 * Derives cohort-level insights from a set of participant SimulationStates.
 * Separate from the simulation engine. No side effects.
 */

import type {
  KPIKey,
  KPIValues,
  PerformanceProfileKey,
  ScoreValues,
  ScoringDimensionKey,
  SimulationState,
} from "@/engine/types";

export interface CohortCompletionSummary {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

export interface CohortKPIAverages {
  averages: KPIValues;
  byRound: Array<{ roundNumber: number; averages: KPIValues }>;
}

export interface CohortScoreAverages {
  averages: ScoreValues;
}

export interface CohortDecisionPattern {
  decisionKey: string;
  optionKey: string;
  selectionCount: number;
  selectionRate: number;
}

export interface CohortProfileDistribution {
  profileKey: PerformanceProfileKey;
  count: number;
  percentage: number;
}

export interface CohortAnalytics {
  completion: CohortCompletionSummary;
  kpiAverages: CohortKPIAverages | null;
  scoreAverages: CohortScoreAverages | null;
  decisionPatterns: CohortDecisionPattern[];
  profileDistribution: CohortProfileDistribution[];
}

export function deriveCohortAnalytics(
  states: SimulationState[]
): CohortAnalytics {
  const completedStates = states.filter((s) => s.status === "completed");

  return {
    completion: buildCompletionSummary(states),
    kpiAverages: completedStates.length > 0 ? buildKPIAverages(completedStates) : null,
    scoreAverages:
      completedStates.length > 0 ? buildScoreAverages(completedStates) : null,
    decisionPatterns: buildDecisionPatterns(completedStates),
    profileDistribution: buildProfileDistribution(completedStates),
  };
}

function buildCompletionSummary(states: SimulationState[]): CohortCompletionSummary {
  const total = states.length;
  const notStarted = states.filter((s) => s.status === "not_started").length;
  const inProgress = states.filter((s) => s.status === "in_progress").length;
  const completed = states.filter((s) => s.status === "completed").length;

  return {
    total,
    notStarted,
    inProgress,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function buildKPIAverages(completedStates: SimulationState[]): CohortKPIAverages {
  const finalSnapshots = completedStates
    .map((s) => s.kpiSnapshots.find((k) => k.snapshotType === "final"))
    .filter(Boolean);

  const averages = averageKPIValues(finalSnapshots.map((s) => s!.kpiValues));

  return { averages, byRound: [] };
}

function buildScoreAverages(completedStates: SimulationState[]): CohortScoreAverages {
  const finalSnapshots = completedStates
    .map((s) => s.scoreSnapshots.find((k) => k.snapshotType === "final"))
    .filter(Boolean);

  const averages = averageScoreValues(finalSnapshots.map((s) => s!.scoreValues));

  return { averages };
}

function buildDecisionPatterns(completedStates: SimulationState[]): CohortDecisionPattern[] {
  const patternMap = new Map<string, { count: number; total: number }>();
  const totalParticipants = completedStates.length;

  for (const state of completedStates) {
    for (const response of state.responses) {
      for (const optionKey of response.selectedOptionIds) {
        const mapKey = `${response.decisionKey}:${optionKey}`;
        const existing = patternMap.get(mapKey) ?? { count: 0, total: totalParticipants };
        patternMap.set(mapKey, { ...existing, count: existing.count + 1 });
      }
    }
  }

  return Array.from(patternMap.entries())
    .map(([key, { count }]) => {
      const [decisionKey, optionKey] = key.split(":");
      return {
        decisionKey,
        optionKey,
        selectionCount: count,
        selectionRate: totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0,
      };
    })
    .sort((a, b) => b.selectionCount - a.selectionCount);
}

function buildProfileDistribution(completedStates: SimulationState[]): CohortProfileDistribution[] {
  const profileCounts = new Map<string, number>();
  const total = completedStates.length;

  for (const state of completedStates) {
    if (state.finalProfileKey) {
      profileCounts.set(
        state.finalProfileKey,
        (profileCounts.get(state.finalProfileKey) ?? 0) + 1
      );
    }
  }

  return Array.from(profileCounts.entries())
    .map(([profileKey, count]) => ({
      profileKey: profileKey as PerformanceProfileKey,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function averageKPIValues(valuesList: KPIValues[]): KPIValues {
  if (valuesList.length === 0) return {} as KPIValues;

  const keys = Object.keys(valuesList[0]) as KPIKey[];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      Math.round(
        valuesList.reduce((sum, v) => sum + (v[key] ?? 0), 0) / valuesList.length
      ),
    ])
  ) as KPIValues;
}

function averageScoreValues(valuesList: ScoreValues[]): ScoreValues {
  if (valuesList.length === 0) return {} as ScoreValues;

  const keys = Object.keys(valuesList[0]) as ScoringDimensionKey[];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      Math.round(
        valuesList.reduce((sum, v) => sum + (v[key] ?? 0), 0) / valuesList.length
      ),
    ])
  ) as ScoreValues;
}
