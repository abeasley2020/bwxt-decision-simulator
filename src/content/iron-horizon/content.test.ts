import { describe, expect, it } from "vitest";

import { KPI_DEFINITIONS } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";

import { IRON_HORIZON_VERSION, PERFORMANCE_PROFILES } from "./index";
import { IRON_HORIZON_CONSEQUENCES } from "./consequences";

const ALL_DECISIONS = IRON_HORIZON_VERSION.rounds.flatMap((r) => r.decisions);
const ALL_OPTIONS = ALL_DECISIONS.flatMap((d) => d.options);
const ALL_RULES = ALL_OPTIONS.flatMap((o) => o.effectRules);

describe("Iron Horizon scenario content", () => {
  it("has three rounds numbered 1 to 3", () => {
    expect(IRON_HORIZON_VERSION.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3]);
  });

  it("has twelve decisions with unique keys", () => {
    const keys = ALL_DECISIONS.map((d) => d.key);

    expect(keys).toHaveLength(12);
    expect(new Set(keys).size).toBe(12);
  });

  it("has globally unique option keys", () => {
    const keys = ALL_OPTIONS.map((o) => o.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every decision at least two options", () => {
    for (const decision of ALL_DECISIONS) {
      expect(decision.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("targets only known KPI keys in kpi effect rules", () => {
    const kpiKeys = new Set(Object.keys(KPI_DEFINITIONS));

    for (const rule of ALL_RULES.filter((r) => r.effectType === "kpi")) {
      expect(kpiKeys).toContain(rule.targetKey);
    }
  });

  it("targets only known scoring dimensions in score effect rules", () => {
    const dimensionKeys = new Set(Object.keys(SCORING_DIMENSIONS));

    for (const rule of ALL_RULES.filter((r) => r.effectType === "score")) {
      expect(dimensionKeys).toContain(rule.targetKey);
    }
  });

  it("keeps min and max choice counts consistent with the option list", () => {
    for (const decision of ALL_DECISIONS) {
      if (decision.minChoices !== undefined && decision.maxChoices !== undefined) {
        expect(decision.minChoices).toBeLessThanOrEqual(decision.maxChoices);
      }
      if (decision.maxChoices !== undefined) {
        expect(decision.maxChoices).toBeLessThanOrEqual(decision.options.length);
      }
    }
  });
});

describe("Performance profile content", () => {
  it("defines eight profiles with unique keys and authored narrative text", () => {
    expect(PERFORMANCE_PROFILES).toHaveLength(8);
    expect(new Set(PERFORMANCE_PROFILES.map((p) => p.key)).size).toBe(8);

    for (const profile of PERFORMANCE_PROFILES) {
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.strengthsText.length).toBeGreaterThan(0);
      expect(profile.blindSpotsText.length).toBeGreaterThan(0);
    }
  });

  it("gives every profile rule a distinct priority order", () => {
    const priorities = PERFORMANCE_PROFILES.flatMap((p) =>
      p.rules.map((r) => r.priorityOrder)
    );

    expect(new Set(priorities).size).toBe(priorities.length);
  });
});

describe("Round consequence content", () => {
  it("keys each consequence by its own round number", () => {
    for (const [key, consequence] of Object.entries(IRON_HORIZON_CONSEQUENCES)) {
      expect(consequence.roundNumber).toBe(Number(key));
      expect(consequence.headline.length).toBeGreaterThan(0);
      expect(consequence.narrative.length).toBeGreaterThan(0);
      expect(consequence.stakeholderReactions.length).toBeGreaterThan(0);
    }
  });

  it("has no Round 3 narrative yet, so the UI falls back to generic copy", () => {
    expect(IRON_HORIZON_CONSEQUENCES[3]).toBeUndefined();
  });
});
