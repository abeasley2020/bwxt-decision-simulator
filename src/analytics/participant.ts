/**
 * Participant Analytics
 *
 * Derives analytics from a participant's SimulationState.
 * Separate from the simulation engine. No side effects.
 */

import type {
  KPISnapshot,
  KPIValues,
  KPIKey,
  ScoreValues,
  ScoringDimensionKey,
  SimulationState,
} from "@/engine/types";

export interface KPITrend {
  key: KPIKey;
  label: string;
  snapshots: Array<{ snapshotType: string; value: number; roundNumber?: number }>;
  netChange: number;
}

export interface ScoreSummary {
  key: ScoringDimensionKey;
  label: string;
  value: number;
  rank: number;
}

export interface ParticipantAnalytics {
  completionStatus: "not_started" | "in_progress" | "completed";
  totalTimeMinutes: number;
  kpiTrends: KPITrend[];
  finalKPIs: KPIValues | null;
  finalScores: ScoreValues | null;
  scoreSummary: ScoreSummary[];
  profileKey: string | null;
  decisionCount: number;
  rationaleCount: number;
}

export function deriveParticipantAnalytics(
  state: SimulationState,
  kpiLabels: Record<KPIKey, string>,
  scoreLabels: Record<ScoringDimensionKey, string>
): ParticipantAnalytics {
  const finalKPISnapshot = getSnapshotOfType(state.kpiSnapshots, "final");
  const initialKPISnapshot = getSnapshotOfType(state.kpiSnapshots, "initial");

  const finalScoreSnapshot =
    state.scoreSnapshots.find((s) => s.snapshotType === "final") ?? null;

  const kpiTrends = buildKPITrends(state.kpiSnapshots, kpiLabels);

  const finalKPIs = finalKPISnapshot?.kpiValues ?? null;
  const finalScores = finalScoreSnapshot?.scoreValues ?? null;

  const scoreSummary = finalScores
    ? buildScoreSummary(finalScores, scoreLabels)
    : [];

  return {
    completionStatus: state.status,
    totalTimeMinutes: Math.round(state.totalTimeSeconds / 60),
    kpiTrends,
    finalKPIs,
    finalScores,
    scoreSummary,
    profileKey: state.finalProfileKey ?? null,
    decisionCount: state.responses.length,
    rationaleCount: state.responses.filter((r) => !!r.shortRationaleText?.trim()).length,
  };
}

function getSnapshotOfType(
  snapshots: KPISnapshot[],
  type: string
): KPISnapshot | null {
  return snapshots.find((s) => s.snapshotType === type) ?? null;
}

function buildKPITrends(
  snapshots: KPISnapshot[],
  labels: Record<KPIKey, string>
): KPITrend[] {
  if (snapshots.length === 0) return [];

  const kpiKeys = Object.keys(snapshots[0].kpiValues) as KPIKey[];

  return kpiKeys.map((key) => {
    const points = snapshots.map((s) => ({
      snapshotType: s.snapshotType,
      value: s.kpiValues[key],
      roundNumber: s.roundNumber,
    }));

    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;

    return {
      key,
      label: labels[key] ?? key,
      snapshots: points,
      netChange: last - first,
    };
  });
}

function buildScoreSummary(
  scores: ScoreValues,
  labels: Record<ScoringDimensionKey, string>
): ScoreSummary[] {
  const entries = Object.entries(scores) as [ScoringDimensionKey, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  return sorted.map(([key, value], index) => ({
    key,
    label: labels[key] ?? key,
    value,
    rank: index + 1,
  }));
}
