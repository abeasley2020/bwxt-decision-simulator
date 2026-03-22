/**
 * KPI Engine
 *
 * Pure functions for KPI state management.
 * No side effects, no UI dependencies.
 */

import type { KPIKey, KPIValues, KPIDefinition } from "./types";

export const KPI_DEFINITIONS: Record<KPIKey, KPIDefinition> = {
  decision_velocity: {
    key: "decision_velocity",
    label: "Decision Velocity",
    description: "Speed and decisiveness of leadership choices",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 60,
  },
  safety_compliance_confidence: {
    key: "safety_compliance_confidence",
    label: "Safety & Compliance Confidence",
    description: "Regulatory and safety posture strength",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 70,
  },
  financial_performance_outlook: {
    key: "financial_performance_outlook",
    label: "Financial Performance Outlook",
    description: "Near-term and long-term financial health trajectory",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 65,
  },
  operational_throughput: {
    key: "operational_throughput",
    label: "Operational Throughput",
    description: "Production capacity and delivery reliability",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 65,
  },
  talent_readiness: {
    key: "talent_readiness",
    label: "Talent Readiness",
    description: "Workforce capability and succession depth",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 55,
  },
  digital_maturity: {
    key: "digital_maturity",
    label: "Digital Maturity",
    description: "Technology adoption and data-driven operations",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 45,
  },
  cross_functional_alignment: {
    key: "cross_functional_alignment",
    label: "Cross-Functional Alignment",
    description: "Organizational cohesion and shared strategic direction",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 60,
  },
  executive_confidence: {
    key: "executive_confidence",
    label: "Executive Confidence",
    description: "Board and senior leadership confidence in direction",
    minValue: 0,
    maxValue: 100,
    defaultStartValue: 65,
  },
};

export function buildInitialKPIs(): KPIValues {
  return Object.fromEntries(
    Object.values(KPI_DEFINITIONS).map((def) => [def.key, def.defaultStartValue])
  ) as KPIValues;
}

export function applyKPIDelta(
  current: KPIValues,
  key: KPIKey,
  delta: number
): KPIValues {
  const def = KPI_DEFINITIONS[key];
  const next = current[key] + delta;
  return {
    ...current,
    [key]: Math.min(def.maxValue, Math.max(def.minValue, next)),
  };
}

export function clampKPI(key: KPIKey, value: number): number {
  const def = KPI_DEFINITIONS[key];
  return Math.min(def.maxValue, Math.max(def.minValue, value));
}

export function getKPILabel(key: KPIKey): string {
  return KPI_DEFINITIONS[key].label;
}

export function computeKPIDelta(
  before: KPIValues,
  after: KPIValues
): Partial<Record<KPIKey, number>> {
  const delta: Partial<Record<KPIKey, number>> = {};
  for (const key of Object.keys(before) as KPIKey[]) {
    const diff = after[key] - before[key];
    if (diff !== 0) delta[key] = diff;
  }
  return delta;
}
