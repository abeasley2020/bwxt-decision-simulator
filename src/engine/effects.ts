/**
 * Effects Engine
 *
 * Applies decision option effects to KPI and score state.
 * Deterministic: same inputs always produce same outputs.
 * No side effects, no UI dependencies.
 */

import type {
  DecisionOption,
  DecisionResponse,
  DecisionTemplate,
  EffectApplicationResult,
  KPIValues,
  ScoreValues,
  KPIKey,
  ScoringDimensionKey,
} from "./types";
import { applyKPIDelta } from "./kpi";
import { applyScoreDelta } from "./scoring";

/**
 * Apply effects from a single decision response to current KPI + score state.
 * Handles multi-select, single-select, and resource_allocation types.
 */
export function applyDecisionEffects(
  response: DecisionResponse,
  template: DecisionTemplate,
  currentKPIs: KPIValues,
  currentScores: ScoreValues
): EffectApplicationResult {
  let kpis = { ...currentKPIs };
  let scores = { ...currentScores };
  const acquiredTraits: string[] = [];

  // Resolve which options were selected
  const selectedOptions = template.options.filter((opt) =>
    response.selectedOptionIds.includes(opt.key)
  );

  for (const option of selectedOptions) {
    const result = applyOptionEffects(option, kpis, scores, response.allocationJson);
    kpis = result.updatedKPIs;
    scores = result.updatedScores;
    acquiredTraits.push(...result.acquiredTraits);
  }

  return {
    updatedKPIs: kpis,
    updatedScores: scores,
    acquiredTraits,
  };
}

/**
 * Apply effects from a single selected option.
 */
function applyOptionEffects(
  option: DecisionOption,
  kpis: KPIValues,
  scores: ScoreValues,
  allocationJson?: Record<string, number>
): EffectApplicationResult {
  let updatedKPIs = { ...kpis };
  let updatedScores = { ...scores };
  const acquiredTraits: string[] = [];

  for (const rule of option.effectRules) {
    if (!evaluateConditions(rule.conditionsJson, kpis, scores)) continue;

    let effectValue = rule.effectValue;

    // For resource_allocation decisions, scale the effect by the allocation amount
    if (allocationJson && allocationJson[option.key] !== undefined) {
      const allocationPct = allocationJson[option.key] / 100;
      effectValue = effectValue * allocationPct;
    }

    switch (rule.effectType) {
      case "kpi":
        updatedKPIs = applyKPIDelta(updatedKPIs, rule.targetKey as KPIKey, effectValue);
        break;
      case "score":
        updatedScores = applyScoreDelta(
          updatedScores,
          rule.targetKey as ScoringDimensionKey,
          effectValue
        );
        break;
      case "hidden_trait":
        if (effectValue > 0) {
          acquiredTraits.push(rule.targetKey);
        }
        break;
    }
  }

  return { updatedKPIs, updatedScores, acquiredTraits };
}

/**
 * Evaluate whether a rule's conditions are met given current state.
 * Returns true if no conditions are specified.
 */
function evaluateConditions(
  conditions: Record<string, unknown> | undefined,
  kpis: KPIValues,
  scores: ScoreValues
): boolean {
  if (!conditions) return true;

  // kpi_above: { key: number } — KPI must exceed threshold
  if (conditions.kpi_above && typeof conditions.kpi_above === "object") {
    for (const [key, threshold] of Object.entries(conditions.kpi_above)) {
      if ((kpis[key as KPIKey] ?? 0) < (threshold as number)) return false;
    }
  }

  // kpi_below: { key: number } — KPI must be below threshold
  if (conditions.kpi_below && typeof conditions.kpi_below === "object") {
    for (const [key, threshold] of Object.entries(conditions.kpi_below)) {
      if ((kpis[key as KPIKey] ?? 0) >= (threshold as number)) return false;
    }
  }

  return true;
}

/**
 * Apply all responses for a round in order.
 */
export function applyRoundResponses(
  responses: DecisionResponse[],
  templates: DecisionTemplate[],
  initialKPIs: KPIValues,
  initialScores: ScoreValues
): EffectApplicationResult {
  let kpis = { ...initialKPIs };
  let scores = { ...initialScores };
  const allTraits: string[] = [];

  const templateMap = new Map(templates.map((t) => [t.key, t]));

  for (const response of responses) {
    const template = templateMap.get(response.decisionKey);
    if (!template) continue;

    const result = applyDecisionEffects(response, template, kpis, scores);
    kpis = result.updatedKPIs;
    scores = result.updatedScores;
    allTraits.push(...result.acquiredTraits);
  }

  return {
    updatedKPIs: kpis,
    updatedScores: scores,
    acquiredTraits: allTraits,
  };
}
