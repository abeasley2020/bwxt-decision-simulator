import { describe, expect, it } from "vitest";

import { buildInitialKPIs } from "@/engine/kpi";
import { buildInitialScores } from "@/engine/scoring";
import type {
  DecisionResponse,
  KPIKey,
  ScoringDimensionKey,
  SimulationState,
} from "@/engine/types";

import { deriveCohortAnalytics } from "./cohort";

function response(
  decisionKey: string,
  selectedOptionIds: string[]
): DecisionResponse {
  return {
    simulationRunId: "run-1",
    roundNumber: 1,
    decisionKey,
    selectedOptionIds,
    respondedAt: "2026-01-01T00:00:00.000Z",
  };
}

function state(
  id: string,
  overrides: Partial<SimulationState> = {}
): SimulationState {
  return {
    runId: id,
    userId: `user-${id}`,
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

function completedWithFinals(
  id: string,
  kpiOverrides: Partial<Record<KPIKey, number>>,
  scoreOverrides: Partial<Record<ScoringDimensionKey, number>>,
  overrides: Partial<SimulationState> = {}
): SimulationState {
  return state(id, {
    kpiSnapshots: [
      {
        simulationRunId: id,
        snapshotType: "final",
        kpiValues: { ...buildInitialKPIs(), ...kpiOverrides },
        capturedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    scoreSnapshots: [
      {
        simulationRunId: id,
        snapshotType: "final",
        scoreValues: { ...buildInitialScores(), ...scoreOverrides },
        capturedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  });
}

describe("deriveCohortAnalytics", () => {
  it("returns an empty analytics shape for an empty cohort", () => {
    const analytics = deriveCohortAnalytics([]);

    expect(analytics.completion).toEqual({
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      completionRate: 0,
    });
    expect(analytics.kpiAverages).toBeNull();
    expect(analytics.scoreAverages).toBeNull();
    expect(analytics.decisionPatterns).toEqual([]);
    expect(analytics.profileDistribution).toEqual([]);
  });

  it("counts each status and rounds the completion rate", () => {
    const analytics = deriveCohortAnalytics([
      state("a", { status: "not_started" }),
      state("b", { status: "in_progress" }),
      state("c", { status: "completed" }),
    ]);

    expect(analytics.completion).toEqual({
      total: 3,
      notStarted: 1,
      inProgress: 1,
      completed: 1,
      completionRate: 33,
    });
  });

  it("averages final KPI and score values across completed runs only", () => {
    const analytics = deriveCohortAnalytics([
      completedWithFinals("a", { digital_maturity: 40 }, { enterprise_judgment: 10 }),
      completedWithFinals("b", { digital_maturity: 70 }, { enterprise_judgment: 21 }),
      completedWithFinals("c", { digital_maturity: 0 }, { enterprise_judgment: 0 }, {
        status: "in_progress",
      }),
    ]);

    expect(analytics.kpiAverages?.averages.digital_maturity).toBe(55);
    expect(analytics.kpiAverages?.byRound).toEqual([]);
    expect(analytics.scoreAverages?.averages.enterprise_judgment).toBe(16);
  });

  it("tallies option selections and sorts patterns by popularity", () => {
    const analytics = deriveCohortAnalytics([
      completedWithFinals("a", {}, {}, {
        responses: [response("d1", ["opt_x", "opt_y"])],
      }),
      completedWithFinals("b", {}, {}, {
        responses: [response("d1", ["opt_x"])],
      }),
      completedWithFinals("c", {}, {}, {
        responses: [response("d1", ["opt_x"])],
      }),
      completedWithFinals("d", {}, {}, {
        responses: [response("d1", ["opt_y"])],
      }),
    ]);

    expect(analytics.decisionPatterns).toEqual([
      {
        decisionKey: "d1",
        optionKey: "opt_x",
        selectionCount: 3,
        selectionRate: 75,
      },
      {
        decisionKey: "d1",
        optionKey: "opt_y",
        selectionCount: 2,
        selectionRate: 50,
      },
    ]);
  });

  it("ignores responses from runs that are not completed", () => {
    const analytics = deriveCohortAnalytics([
      state("a", {
        status: "in_progress",
        responses: [response("d1", ["opt_x"])],
      }),
    ]);

    expect(analytics.decisionPatterns).toEqual([]);
  });

  it("distributes profiles by count and percentage, skipping unassigned runs", () => {
    const analytics = deriveCohortAnalytics([
      completedWithFinals("a", {}, {}, { finalProfileKey: "enterprise_catalyst" }),
      completedWithFinals("b", {}, {}, { finalProfileKey: "enterprise_catalyst" }),
      completedWithFinals("c", {}, {}, { finalProfileKey: "cautious_operator" }),
      completedWithFinals("d", {}, {}),
    ]);

    expect(analytics.profileDistribution).toEqual([
      { profileKey: "enterprise_catalyst", count: 2, percentage: 50 },
      { profileKey: "cautious_operator", count: 1, percentage: 25 },
    ]);
  });

  it("yields empty averages when completed runs have no final snapshots", () => {
    const analytics = deriveCohortAnalytics([state("a")]);

    expect(analytics.kpiAverages).toEqual({ averages: {}, byRound: [] });
    expect(analytics.scoreAverages).toEqual({ averages: {} });
  });
});
