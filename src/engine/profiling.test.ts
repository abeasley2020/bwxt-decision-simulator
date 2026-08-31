import { describe, expect, it } from "vitest";

import { buildInitialKPIs } from "./kpi";
import { assignPerformanceProfile } from "./profiling";
import { buildInitialScores } from "./scoring";
import type {
  PerformanceProfile,
  PerformanceProfileKey,
  ProfileRuleLogic,
  ScoreValues,
} from "./types";

function profile(
  key: PerformanceProfileKey,
  rules: Array<{ logic: ProfileRuleLogic; priority: number }>
): PerformanceProfile {
  return {
    key,
    label: key,
    description: "",
    strengthsText: "",
    blindSpotsText: "",
    rules: rules.map(({ logic, priority }) => ({
      ruleLogicJson: logic,
      priorityOrder: priority,
    })),
  };
}

function scores(overrides: Partial<ScoreValues>): ScoreValues {
  return { ...buildInitialScores(), ...overrides };
}

describe("assignPerformanceProfile", () => {
  it("returns the matching profile and the rule that matched", () => {
    const profiles = [
      profile("enterprise_catalyst", [
        { logic: { scoreThresholds: { enterprise_judgment: 10 } }, priority: 1 },
      ]),
    ];

    const result = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ enterprise_judgment: 12 }),
      [],
      profiles
    );

    expect(result.profileKey).toBe("enterprise_catalyst");
    expect(result.matchedRules).toEqual([profiles[0].rules[0]]);
  });

  it("evaluates rules in priority order across profiles, not declaration order", () => {
    const profiles = [
      profile("cautious_operator", [
        { logic: { scoreThresholds: { enterprise_judgment: 5 } }, priority: 20 },
      ]),
      profile("disciplined_accelerator", [
        { logic: { scoreThresholds: { enterprise_judgment: 5 } }, priority: 10 },
      ]),
    ];

    const result = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ enterprise_judgment: 30 }),
      [],
      profiles
    );

    expect(result.profileKey).toBe("disciplined_accelerator");
  });

  it("treats a score threshold as a minimum that must be met exactly or exceeded", () => {
    const profiles = [
      profile("enterprise_catalyst", [
        { logic: { scoreThresholds: { enterprise_judgment: 10 } }, priority: 1 },
      ]),
    ];

    const met = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ enterprise_judgment: 10 }),
      [],
      profiles
    );
    const missed = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ enterprise_judgment: 9, talent_leadership: 50 }),
      [],
      profiles
    );

    expect(met.profileKey).toBe("enterprise_catalyst");
    expect(missed.matchedRules).toEqual([]);
  });

  it("rejects a rule when any score ceiling is exceeded", () => {
    const profiles = [
      profile("talent_blind_spot", [
        { logic: { scoreCeilings: { talent_leadership: 5 } }, priority: 1 },
      ]),
    ];

    const matched = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ talent_leadership: 5 }),
      [],
      profiles
    );
    const rejected = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ talent_leadership: 6 }),
      [],
      profiles
    );

    expect(matched.profileKey).toBe("talent_blind_spot");
    expect(rejected.matchedRules).toEqual([]);
  });

  it("rejects a rule when a KPI threshold is not met", () => {
    const profiles = [
      profile("functional_optimizer", [
        {
          logic: { kpiThresholds: { operational_throughput: 80 } },
          priority: 1,
        },
      ]),
    ];

    const rejected = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      [],
      profiles
    );
    const matched = assignPerformanceProfile(
      { ...buildInitialKPIs(), operational_throughput: 85 },
      buildInitialScores(),
      [],
      profiles
    );

    expect(rejected.matchedRules).toEqual([]);
    expect(matched.profileKey).toBe("functional_optimizer");
  });

  it("requires every listed trait to be present", () => {
    const profiles = [
      profile("innovation_without_guardrails", [
        {
          logic: { requiredTraits: ["risk_tolerant", "tech_forward"] },
          priority: 1,
        },
      ]),
    ];

    const partial = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      ["risk_tolerant"],
      profiles
    );
    const full = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      ["risk_tolerant", "tech_forward", "extra"],
      profiles
    );

    expect(partial.matchedRules).toEqual([]);
    expect(full.profileKey).toBe("innovation_without_guardrails");
  });

  it("requires dominant dimensions to average above the remaining dimensions", () => {
    const profiles = [
      profile("strategic_communicator", [
        {
          logic: { dominantDimensions: ["communication_alignment"] },
          priority: 1,
        },
      ]),
    ];

    const dominant = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ communication_alignment: 20, enterprise_judgment: 5 }),
      [],
      profiles
    );
    const notDominant = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ communication_alignment: 5, enterprise_judgment: 40 }),
      [],
      profiles
    );

    expect(dominant.profileKey).toBe("strategic_communicator");
    expect(notDominant.matchedRules).toEqual([]);
  });

  it("matches when every dimension is listed as dominant and any score is positive", () => {
    const allDimensions = Object.keys(
      buildInitialScores()
    ) as Array<keyof ScoreValues>;
    const profiles = [
      profile("enterprise_catalyst", [
        { logic: { dominantDimensions: allDimensions }, priority: 1 },
      ]),
    ];

    const positive = assignPerformanceProfile(
      buildInitialKPIs(),
      scores({ enterprise_judgment: 1 }),
      [],
      profiles
    );
    const allZero = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      [],
      profiles
    );

    expect(positive.matchedRules).toHaveLength(1);
    expect(allZero.matchedRules).toEqual([]);
  });

  it("matches an empty rule as a catch-all", () => {
    const profiles = [
      profile("enterprise_catalyst", [
        { logic: { scoreThresholds: { enterprise_judgment: 999 } }, priority: 1 },
      ]),
      profile("functional_optimizer", [{ logic: {}, priority: 99 }]),
    ];

    const result = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      [],
      profiles
    );

    expect(result.profileKey).toBe("functional_optimizer");
  });

  it("falls back to the highest scoring dimension when no rule matches", () => {
    const cases: Array<[keyof ScoreValues, PerformanceProfileKey]> = [
      ["enterprise_judgment", "enterprise_catalyst"],
      ["decision_velocity_with_discipline", "disciplined_accelerator"],
      ["financial_strategic_acumen", "functional_optimizer"],
      ["technology_data_leadership", "data_enabled_builder"],
      ["talent_leadership", "enterprise_catalyst"],
      ["communication_alignment", "strategic_communicator"],
      ["continuous_improvement_orientation", "cautious_operator"],
    ];

    for (const [dimension, expected] of cases) {
      const result = assignPerformanceProfile(
        buildInitialKPIs(),
        scores({ [dimension]: 25 }),
        [],
        []
      );

      expect(result.profileKey).toBe(expected);
      expect(result.matchedRules).toEqual([]);
    }
  });

  it("falls back to enterprise_catalyst when all dimensions are tied at zero", () => {
    const result = assignPerformanceProfile(
      buildInitialKPIs(),
      buildInitialScores(),
      [],
      []
    );

    expect(result.profileKey).toBe("enterprise_catalyst");
  });
});
