/**
 * Scoring Engine
 *
 * Pure functions for score dimension management.
 * No side effects, no UI dependencies.
 */

import type { ScoringDimensionKey, ScoreValues, ScoringDimension } from "./types";

export const SCORING_DIMENSIONS: Record<ScoringDimensionKey, ScoringDimension> = {
  enterprise_judgment: {
    key: "enterprise_judgment",
    label: "Enterprise Judgment",
    description:
      "Balances short-term pressure with long-term strategic positioning across the enterprise",
  },
  decision_velocity_with_discipline: {
    key: "decision_velocity_with_discipline",
    label: "Decision Velocity with Discipline",
    description:
      "Makes timely, clear decisions without sacrificing analysis or rigor",
  },
  financial_strategic_acumen: {
    key: "financial_strategic_acumen",
    label: "Financial & Strategic Acumen",
    description:
      "Allocates capital and resources with strategic precision and financial literacy",
  },
  technology_data_leadership: {
    key: "technology_data_leadership",
    label: "Technology & Data Leadership",
    description:
      "Drives digital transformation with governance and appropriate risk tolerance",
  },
  talent_leadership: {
    key: "talent_leadership",
    label: "Talent Leadership",
    description:
      "Builds, develops, and retains the capabilities the organization requires",
  },
  communication_alignment: {
    key: "communication_alignment",
    label: "Communication & Alignment",
    description:
      "Creates clarity, trust, and organizational momentum through communication",
  },
  continuous_improvement_orientation: {
    key: "continuous_improvement_orientation",
    label: "Continuous Improvement Orientation",
    description:
      "Learns from outcomes, adapts, and improves the operating model over time",
  },
};

export function buildInitialScores(): ScoreValues {
  return Object.fromEntries(
    Object.keys(SCORING_DIMENSIONS).map((key) => [key, 0])
  ) as ScoreValues;
}

export function applyScoreDelta(
  current: ScoreValues,
  key: ScoringDimensionKey,
  delta: number
): ScoreValues {
  return {
    ...current,
    [key]: current[key] + delta,
  };
}

export function getScoringLabel(key: ScoringDimensionKey): string {
  return SCORING_DIMENSIONS[key].label;
}

export function normalizeScoringValues(scores: ScoreValues, max: number = 100): ScoreValues {
  const values = Object.values(scores);
  const currentMax = Math.max(...values);
  if (currentMax === 0) return scores;
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.round((v / currentMax) * max)])
  ) as ScoreValues;
}
