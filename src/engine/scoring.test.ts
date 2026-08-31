import { describe, expect, it } from "vitest";

import {
  SCORING_DIMENSIONS,
  applyScoreDelta,
  buildInitialScores,
  getScoringLabel,
  normalizeScoringValues,
} from "./scoring";
import type { ScoringDimensionKey } from "./types";

const ALL_DIMENSION_KEYS = Object.keys(
  SCORING_DIMENSIONS
) as ScoringDimensionKey[];

describe("buildInitialScores", () => {
  it("starts every scoring dimension at zero", () => {
    const scores = buildInitialScores();

    expect(Object.keys(scores).sort()).toEqual([...ALL_DIMENSION_KEYS].sort());
    for (const key of ALL_DIMENSION_KEYS) {
      expect(scores[key]).toBe(0);
    }
  });
});

describe("applyScoreDelta", () => {
  it("accumulates without clamping", () => {
    let scores = buildInitialScores();
    scores = applyScoreDelta(scores, "enterprise_judgment", 40);
    scores = applyScoreDelta(scores, "enterprise_judgment", 80);

    expect(scores.enterprise_judgment).toBe(120);
  });

  it("allows negative totals", () => {
    const scores = applyScoreDelta(buildInitialScores(), "talent_leadership", -7);

    expect(scores.talent_leadership).toBe(-7);
  });

  it("does not mutate the input", () => {
    const before = buildInitialScores();
    applyScoreDelta(before, "communication_alignment", 5);

    expect(before.communication_alignment).toBe(0);
  });
});

describe("getScoringLabel", () => {
  it("returns the authored label", () => {
    expect(getScoringLabel("technology_data_leadership")).toBe(
      "Technology & Data Leadership"
    );
  });
});

describe("normalizeScoringValues", () => {
  it("scales the highest dimension to the max and the rest proportionally", () => {
    const scores = { ...buildInitialScores(), enterprise_judgment: 20, talent_leadership: 10 };

    const normalized = normalizeScoringValues(scores);

    expect(normalized.enterprise_judgment).toBe(100);
    expect(normalized.talent_leadership).toBe(50);
    expect(normalized.communication_alignment).toBe(0);
  });

  it("honors a custom max", () => {
    const scores = { ...buildInitialScores(), enterprise_judgment: 8, talent_leadership: 4 };

    const normalized = normalizeScoringValues(scores, 10);

    expect(normalized.enterprise_judgment).toBe(10);
    expect(normalized.talent_leadership).toBe(5);
  });

  it("rounds to whole numbers", () => {
    const scores = { ...buildInitialScores(), enterprise_judgment: 3, talent_leadership: 1 };

    expect(normalizeScoringValues(scores).talent_leadership).toBe(33);
  });

  it("returns the input unchanged when the top score is zero", () => {
    const scores = buildInitialScores();

    expect(normalizeScoringValues(scores)).toBe(scores);
  });
});
