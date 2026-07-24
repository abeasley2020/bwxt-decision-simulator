import { describe, expect, it } from "vitest";

import {
  applyDecisionEffects,
  applyRoundResponses,
  deriveAcquiredTraits,
} from "./effects";
import { buildInitialKPIs } from "./kpi";
import { buildInitialScores } from "./scoring";
import type {
  DecisionEffectRule,
  DecisionOption,
  DecisionResponse,
  DecisionTemplate,
  ScenarioRound,
} from "./types";

function option(
  key: string,
  effectRules: DecisionEffectRule[]
): DecisionOption {
  return {
    key,
    label: key,
    description: "",
    sortOrder: 0,
    effectRules,
  };
}

function template(
  key: string,
  options: DecisionOption[],
  decisionType: DecisionTemplate["decisionType"] = "single_select"
): DecisionTemplate {
  return {
    key,
    title: key,
    prompt: "",
    decisionType,
    isRequired: true,
    sortOrder: 0,
    options,
  };
}

function response(
  decisionKey: string,
  selectedOptionIds: string[],
  extra: Partial<DecisionResponse> = {}
): DecisionResponse {
  return {
    simulationRunId: "run-1",
    roundNumber: 1,
    decisionKey,
    selectedOptionIds,
    respondedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("applyDecisionEffects", () => {
  it("applies kpi and score effects from the selected option", () => {
    const decision = template("d1", [
      option("a", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
        { effectType: "score", targetKey: "enterprise_judgment", effectValue: 3 },
      ]),
      option("b", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: -10 },
      ]),
    ]);

    const result = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(55);
    expect(result.updatedScores.enterprise_judgment).toBe(3);
    expect(result.acquiredTraits).toEqual([]);
  });

  it("ignores options that were not selected", () => {
    const decision = template("d1", [
      option("a", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
      ]),
      option("b", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: 40 },
      ]),
    ]);

    const result = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(55);
  });

  it("accumulates effects across every selected option in a multi-select", () => {
    const decision = template(
      "d1",
      [
        option("a", [
          { effectType: "kpi", targetKey: "talent_readiness", effectValue: 5 },
        ]),
        option("b", [
          { effectType: "kpi", targetKey: "talent_readiness", effectValue: 7 },
        ]),
        option("c", [
          { effectType: "kpi", targetKey: "talent_readiness", effectValue: 100 },
        ]),
      ],
      "multi_select"
    );

    const result = applyDecisionEffects(
      response("d1", ["a", "b"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.talent_readiness).toBe(67);
  });

  it("collects hidden traits only for positive effect values", () => {
    const decision = template("d1", [
      option("a", [
        { effectType: "hidden_trait", targetKey: "growth_minded", effectValue: 1 },
        { effectType: "hidden_trait", targetKey: "risk_averse", effectValue: 0 },
        { effectType: "hidden_trait", targetKey: "short_termist", effectValue: -1 },
      ]),
    ]);

    const result = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.acquiredTraits).toEqual(["growth_minded"]);
  });

  it("scales effects by allocated percent for resource allocation decisions", () => {
    const decision = template(
      "d1",
      [
        option("infra", [
          { effectType: "kpi", targetKey: "digital_maturity", effectValue: 20 },
          { effectType: "score", targetKey: "financial_strategic_acumen", effectValue: 10 },
        ]),
        option("people", [
          { effectType: "kpi", targetKey: "talent_readiness", effectValue: 20 },
        ]),
      ],
      "resource_allocation"
    );

    const result = applyDecisionEffects(
      response("d1", ["infra", "people"], {
        allocationJson: { infra: 75, people: 25 },
      }),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(60);
    expect(result.updatedScores.financial_strategic_acumen).toBe(7.5);
    expect(result.updatedKPIs.talent_readiness).toBe(60);
  });

  it("leaves effects unscaled for options missing from the allocation map", () => {
    const decision = template(
      "d1",
      [
        option("infra", [
          { effectType: "kpi", targetKey: "digital_maturity", effectValue: 20 },
        ]),
      ],
      "resource_allocation"
    );

    const result = applyDecisionEffects(
      response("d1", ["infra"], { allocationJson: { people: 100 } }),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(65);
  });

  it("zeroes out effects for a zero percent allocation", () => {
    const decision = template(
      "d1",
      [
        option("infra", [
          { effectType: "kpi", targetKey: "digital_maturity", effectValue: 20 },
        ]),
      ],
      "resource_allocation"
    );

    const result = applyDecisionEffects(
      response("d1", ["infra"], { allocationJson: { infra: 0 } }),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(45);
  });

  it("applies a kpi_above conditional rule only when the threshold is exceeded", () => {
    const decision = template("d1", [
      option("a", [
        {
          effectType: "kpi",
          targetKey: "executive_confidence",
          effectValue: 5,
          conditionsJson: { kpi_above: { digital_maturity: 50 } },
        },
      ]),
    ]);

    const blocked = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );
    const allowed = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      { ...buildInitialKPIs(), digital_maturity: 80 },
      buildInitialScores()
    );

    expect(blocked.updatedKPIs.executive_confidence).toBe(65);
    expect(allowed.updatedKPIs.executive_confidence).toBe(70);
  });

  it("applies a kpi_below conditional rule only when the value is under the threshold", () => {
    const decision = template("d1", [
      option("a", [
        {
          effectType: "kpi",
          targetKey: "executive_confidence",
          effectValue: 5,
          conditionsJson: { kpi_below: { digital_maturity: 50 } },
        },
      ]),
    ]);

    const allowed = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );
    const blocked = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      { ...buildInitialKPIs(), digital_maturity: 50 },
      buildInitialScores()
    );

    expect(allowed.updatedKPIs.executive_confidence).toBe(70);
    expect(blocked.updatedKPIs.executive_confidence).toBe(65);
  });

  it("evaluates a later option's conditions against state moved by an earlier option", () => {
    const decision = template(
      "d1",
      [
        option("a", [
          { effectType: "kpi", targetKey: "digital_maturity", effectValue: 30 },
        ]),
        option("b", [
          {
            effectType: "score",
            targetKey: "technology_data_leadership",
            effectValue: 4,
            conditionsJson: { kpi_above: { digital_maturity: 70 } },
          },
        ]),
      ],
      "multi_select"
    );

    const result = applyDecisionEffects(
      response("d1", ["a", "b"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(75);
    expect(result.updatedScores.technology_data_leadership).toBe(4);
  });

  it("evaluates rules inside one option against the state before that option ran", () => {
    const decision = template("d1", [
      option("a", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: 30 },
        {
          effectType: "score",
          targetKey: "technology_data_leadership",
          effectValue: 4,
          conditionsJson: { kpi_above: { digital_maturity: 70 } },
        },
      ]),
    ]);

    const result = applyDecisionEffects(
      response("d1", ["a"]),
      decision,
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(75);
    expect(result.updatedScores.technology_data_leadership).toBe(0);
  });
});

describe("applyRoundResponses", () => {
  const decisionOne = template("d1", [
    option("a", [
      { effectType: "kpi", targetKey: "digital_maturity", effectValue: 10 },
      { effectType: "hidden_trait", targetKey: "tech_forward", effectValue: 1 },
    ]),
  ]);
  const decisionTwo = template("d2", [
    option("x", [
      { effectType: "kpi", targetKey: "digital_maturity", effectValue: 5 },
      { effectType: "hidden_trait", targetKey: "collaborative", effectValue: 1 },
    ]),
  ]);

  it("chains state through every response and collects traits", () => {
    const result = applyRoundResponses(
      [response("d1", ["a"]), response("d2", ["x"])],
      [decisionOne, decisionTwo],
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(60);
    expect(result.acquiredTraits).toEqual(["tech_forward", "collaborative"]);
  });

  it("skips responses whose decision key has no template", () => {
    const result = applyRoundResponses(
      [response("unknown", ["a"]), response("d1", ["a"])],
      [decisionOne],
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(result.updatedKPIs.digital_maturity).toBe(55);
  });

  it("returns the initial state when there are no responses", () => {
    const initialKPIs = buildInitialKPIs();

    const result = applyRoundResponses(
      [],
      [decisionOne],
      initialKPIs,
      buildInitialScores()
    );

    expect(result.updatedKPIs).toEqual(initialKPIs);
    expect(result.acquiredTraits).toEqual([]);
  });
});

describe("deriveAcquiredTraits", () => {
  function round(roundNumber: number, decisions: DecisionTemplate[]): ScenarioRound {
    return {
      roundNumber,
      title: `Round ${roundNumber}`,
      description: "",
      briefingContent: "",
      eventContent: "",
      sortOrder: roundNumber,
      decisions,
    };
  }

  const roundOne = round(1, [
    template("r1_d1", [
      option("a", [
        { effectType: "kpi", targetKey: "digital_maturity", effectValue: 30 },
        { effectType: "hidden_trait", targetKey: "tech_forward", effectValue: 1 },
      ]),
    ]),
  ]);
  const roundTwo = round(2, [
    template("r2_d1", [
      option("a", [
        {
          effectType: "hidden_trait",
          targetKey: "compounding_investor",
          effectValue: 1,
          conditionsJson: { kpi_above: { digital_maturity: 70 } },
        },
      ]),
    ]),
  ]);

  it("replays rounds in order so later conditions see earlier state", () => {
    const traits = deriveAcquiredTraits(
      [
        response("r2_d1", ["a"], { roundNumber: 2 }),
        response("r1_d1", ["a"], { roundNumber: 1 }),
      ],
      [roundTwo, roundOne],
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(traits).toEqual(["tech_forward", "compounding_investor"]);
  });

  it("does not award a conditional trait when the earlier round did not move the KPI", () => {
    const traits = deriveAcquiredTraits(
      [response("r2_d1", ["a"], { roundNumber: 2 })],
      [roundOne, roundTwo],
      buildInitialKPIs(),
      buildInitialScores()
    );

    expect(traits).toEqual([]);
  });

  it("returns an empty list when there are no responses", () => {
    expect(
      deriveAcquiredTraits(
        [],
        [roundOne, roundTwo],
        buildInitialKPIs(),
        buildInitialScores()
      )
    ).toEqual([]);
  });
});
