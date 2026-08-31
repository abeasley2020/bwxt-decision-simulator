import { describe, expect, it } from "vitest";

import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { SCORING_DIMENSIONS, buildInitialScores } from "@/engine/scoring";
import type {
  DecisionResponse,
  KPIKey,
  KPISnapshot,
  ScoreSnapshot,
  ScoringDimensionKey,
  SimulationState,
} from "@/engine/types";

import { deriveParticipantAnalytics } from "./participant";

const KPI_LABELS = Object.fromEntries(
  Object.values(KPI_DEFINITIONS).map((d) => [d.key, d.label])
) as Record<KPIKey, string>;

const SCORE_LABELS = Object.fromEntries(
  Object.values(SCORING_DIMENSIONS).map((d) => [d.key, d.label])
) as Record<ScoringDimensionKey, string>;

function kpiSnapshot(
  snapshotType: KPISnapshot["snapshotType"],
  overrides: Partial<Record<KPIKey, number>>,
  roundNumber?: number
): KPISnapshot {
  return {
    simulationRunId: "run-1",
    snapshotType,
    roundNumber,
    kpiValues: { ...buildInitialKPIs(), ...overrides },
    capturedAt: "2026-01-01T00:00:00.000Z",
  };
}

function scoreSnapshot(
  snapshotType: ScoreSnapshot["snapshotType"],
  overrides: Partial<Record<ScoringDimensionKey, number>>
): ScoreSnapshot {
  return {
    simulationRunId: "run-1",
    snapshotType,
    scoreValues: { ...buildInitialScores(), ...overrides },
    capturedAt: "2026-01-01T00:00:00.000Z",
  };
}

function decisionResponse(
  decisionKey: string,
  shortRationaleText?: string
): DecisionResponse {
  return {
    simulationRunId: "run-1",
    roundNumber: 1,
    decisionKey,
    selectedOptionIds: ["a"],
    shortRationaleText,
    respondedAt: "2026-01-01T00:00:00.000Z",
  };
}

function state(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    runId: "run-1",
    userId: "user-1",
    cohortId: "cohort-1",
    scenarioVersionId: "version-1",
    status: "completed",
    currentRoundNumber: 3,
    responses: [],
    kpiSnapshots: [],
    scoreSnapshots: [],
    startedAt: "2026-01-01T00:00:00.000Z",
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    totalTimeSeconds: 0,
    ...overrides,
  };
}

describe("deriveParticipantAnalytics", () => {
  it("summarizes an empty run", () => {
    const analytics = deriveParticipantAnalytics(
      state({ status: "not_started" }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics).toEqual({
      completionStatus: "not_started",
      totalTimeMinutes: 0,
      kpiTrends: [],
      finalKPIs: null,
      finalScores: null,
      scoreSummary: [],
      profileKey: null,
      decisionCount: 0,
      rationaleCount: 0,
    });
  });

  it("rounds total time to the nearest minute", () => {
    const analytics = deriveParticipantAnalytics(
      state({ totalTimeSeconds: 100 }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.totalTimeMinutes).toBe(2);
  });

  it("counts decisions and only rationales with non-blank text", () => {
    const analytics = deriveParticipantAnalytics(
      state({
        responses: [
          decisionResponse("d1", "Protecting margin"),
          decisionResponse("d2", "   "),
          decisionResponse("d3"),
        ],
      }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.decisionCount).toBe(3);
    expect(analytics.rationaleCount).toBe(1);
  });

  it("builds one trend per KPI with net change across all snapshots", () => {
    const analytics = deriveParticipantAnalytics(
      state({
        kpiSnapshots: [
          kpiSnapshot("initial", {}),
          kpiSnapshot("round_end", { digital_maturity: 55 }, 1),
          kpiSnapshot("round_end", { digital_maturity: 70 }, 2),
        ],
      }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.kpiTrends).toHaveLength(8);

    const digital = analytics.kpiTrends.find((t) => t.key === "digital_maturity");
    expect(digital?.label).toBe("Digital Maturity");
    expect(digital?.netChange).toBe(25);
    expect(digital?.snapshots).toEqual([
      { snapshotType: "initial", value: 45, roundNumber: undefined },
      { snapshotType: "round_end", value: 55, roundNumber: 1 },
      { snapshotType: "round_end", value: 70, roundNumber: 2 },
    ]);

    const talent = analytics.kpiTrends.find((t) => t.key === "talent_readiness");
    expect(talent?.netChange).toBe(0);
  });

  it("ranks score dimensions from highest to lowest", () => {
    const analytics = deriveParticipantAnalytics(
      state({
        scoreSnapshots: [
          scoreSnapshot("final", {
            enterprise_judgment: 12,
            talent_leadership: 30,
            communication_alignment: 20,
          }),
        ],
      }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.scoreSummary.slice(0, 3)).toEqual([
      { key: "talent_leadership", label: "Talent Leadership", value: 30, rank: 1 },
      {
        key: "communication_alignment",
        label: "Communication & Alignment",
        value: 20,
        rank: 2,
      },
      {
        key: "enterprise_judgment",
        label: "Enterprise Judgment",
        value: 12,
        rank: 3,
      },
    ]);
  });

  it("passes the persisted profile key through", () => {
    const analytics = deriveParticipantAnalytics(
      state({ finalProfileKey: "data_enabled_builder" }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.profileKey).toBe("data_enabled_builder");
  });

  it("reports no final KPI or score values when only round_end snapshots exist", () => {
    const analytics = deriveParticipantAnalytics(
      state({
        kpiSnapshots: [kpiSnapshot("round_end", { digital_maturity: 70 }, 3)],
        scoreSnapshots: [scoreSnapshot("round_end", { enterprise_judgment: 9 })],
      }),
      KPI_LABELS,
      SCORE_LABELS
    );

    expect(analytics.finalKPIs).toBeNull();
    expect(analytics.finalScores).toBeNull();
    expect(analytics.scoreSummary).toEqual([]);
  });
});
