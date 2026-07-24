import { describe, expect, it } from "vitest";

import {
  KPI_DEFINITIONS,
  applyKPIDelta,
  buildInitialKPIs,
  clampKPI,
  computeKPIDelta,
  getKPILabel,
} from "./kpi";
import type { KPIKey } from "./types";

const ALL_KPI_KEYS = Object.keys(KPI_DEFINITIONS) as KPIKey[];

describe("buildInitialKPIs", () => {
  it("returns every KPI at its authored default start value", () => {
    const kpis = buildInitialKPIs();

    expect(Object.keys(kpis).sort()).toEqual([...ALL_KPI_KEYS].sort());
    for (const key of ALL_KPI_KEYS) {
      expect(kpis[key]).toBe(KPI_DEFINITIONS[key].defaultStartValue);
    }
  });

  it("returns a fresh object on each call", () => {
    const first = buildInitialKPIs();
    const second = buildInitialKPIs();

    first.digital_maturity = 1;

    expect(second.digital_maturity).toBe(
      KPI_DEFINITIONS.digital_maturity.defaultStartValue
    );
  });
});

describe("applyKPIDelta", () => {
  it("adds the delta without mutating the input", () => {
    const before = buildInitialKPIs();
    const after = applyKPIDelta(before, "talent_readiness", 12);

    expect(after.talent_readiness).toBe(before.talent_readiness + 12);
    expect(before.talent_readiness).toBe(
      KPI_DEFINITIONS.talent_readiness.defaultStartValue
    );
  });

  it("subtracts negative deltas", () => {
    const after = applyKPIDelta(buildInitialKPIs(), "operational_throughput", -15);

    expect(after.operational_throughput).toBe(50);
  });

  it("clamps at the maximum", () => {
    const after = applyKPIDelta(buildInitialKPIs(), "executive_confidence", 500);

    expect(after.executive_confidence).toBe(
      KPI_DEFINITIONS.executive_confidence.maxValue
    );
  });

  it("clamps at the minimum", () => {
    const after = applyKPIDelta(buildInitialKPIs(), "executive_confidence", -500);

    expect(after.executive_confidence).toBe(
      KPI_DEFINITIONS.executive_confidence.minValue
    );
  });

  it("leaves other KPIs untouched", () => {
    const before = buildInitialKPIs();
    const after = applyKPIDelta(before, "digital_maturity", 10);

    for (const key of ALL_KPI_KEYS) {
      if (key === "digital_maturity") continue;
      expect(after[key]).toBe(before[key]);
    }
  });

  it("preserves fractional deltas from scaled allocation effects", () => {
    const after = applyKPIDelta(buildInitialKPIs(), "decision_velocity", 2.5);

    expect(after.decision_velocity).toBeCloseTo(62.5);
  });
});

describe("clampKPI", () => {
  it("passes through in-range values", () => {
    expect(clampKPI("talent_readiness", 42)).toBe(42);
  });

  it("clamps out-of-range values to the definition bounds", () => {
    expect(clampKPI("talent_readiness", 140)).toBe(100);
    expect(clampKPI("talent_readiness", -40)).toBe(0);
  });
});

describe("getKPILabel", () => {
  it("returns the authored label", () => {
    expect(getKPILabel("safety_compliance_confidence")).toBe(
      "Safety & Compliance Confidence"
    );
  });
});

describe("computeKPIDelta", () => {
  it("reports only the KPIs that changed", () => {
    const before = buildInitialKPIs();
    const after = { ...before, digital_maturity: before.digital_maturity + 8 };

    expect(computeKPIDelta(before, after)).toEqual({ digital_maturity: 8 });
  });

  it("reports negative movement", () => {
    const before = buildInitialKPIs();
    const after = { ...before, talent_readiness: before.talent_readiness - 5 };

    expect(computeKPIDelta(before, after)).toEqual({ talent_readiness: -5 });
  });

  it("returns an empty object when nothing changed", () => {
    const before = buildInitialKPIs();

    expect(computeKPIDelta(before, { ...before })).toEqual({});
  });
});
