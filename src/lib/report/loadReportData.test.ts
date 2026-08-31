import { describe, expect, it } from "vitest";

import { buildInitialKPIs } from "@/engine/kpi";

import { loadReportData } from "./loadReportData";

type Row = Record<string, unknown>;

/**
 * Minimal stand-in for the Supabase query builder. Rows are configured per
 * table; `eq` and `in` filter them by column, `maybeSingle` resolves to the
 * first surviving row, and awaiting the builder resolves to all of them.
 */
function fakeSupabase(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = tables[table] ?? [];

      const builder = {
        select: () => builder,
        order: () => builder,
        eq(column: string, value: unknown) {
          rows = rows.filter((r) => r[column] === value);
          return builder;
        },
        in(column: string, values: unknown[]) {
          rows = rows.filter((r) => values.includes(r[column]));
          return builder;
        },
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null }),
        then(resolve: (value: { data: Row[] }) => unknown) {
          return Promise.resolve({ data: rows }).then(resolve);
        },
      };

      return builder;
    },
  };
}

const RUN_ID = "run-1";
const USER_ID = "user-1";
const SCENARIO_VERSION_ID = "version-1";

const ROUND_ROWS = [
  { id: "round-1-id", round_number: 1, scenario_version_id: SCENARIO_VERSION_ID },
  { id: "round-2-id", round_number: 2, scenario_version_id: SCENARIO_VERSION_ID },
  { id: "round-3-id", round_number: 3, scenario_version_id: SCENARIO_VERSION_ID },
];

const TEMPLATE_ROWS = [
  { id: "tpl-pri", key: "r1_prioritization", scenario_round_id: "round-1-id" },
  { id: "tpl-cap", key: "r1_capital", scenario_round_id: "round-1-id" },
  { id: "tpl-comm", key: "r1_communication", scenario_round_id: "round-1-id" },
];

function runRow(overrides: Row = {}): Row {
  return {
    id: RUN_ID,
    status: "completed",
    user_id: USER_ID,
    cohort_id: "cohort-1",
    scenario_version_id: SCENARIO_VERSION_ID,
    final_profile_id: null,
    self_assessment_json: null,
    completed_at: "2026-02-01T00:00:00.000Z",
    started_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseTables(overrides: Record<string, Row[]> = {}) {
  return {
    simulation_runs: [runRow()],
    users: [
      {
        id: USER_ID,
        first_name: "Dana",
        last_name: "Reyes",
        email: "dana@example.com",
      },
    ],
    cohorts: [{ id: "cohort-1", name: "Spring Academy" }],
    scenario_rounds: ROUND_ROWS,
    decision_templates: TEMPLATE_ROWS,
    kpi_snapshots: [],
    score_snapshots: [],
    decision_responses: [],
    executive_recommendations: [],
    performance_profiles: [],
    ...overrides,
  };
}

describe("loadReportData", () => {
  it("returns null when the run does not exist", async () => {
    const data = await loadReportData(
      fakeSupabase(baseTables({ simulation_runs: [] })),
      RUN_ID
    );

    expect(data).toBeNull();
  });

  it("returns null when the run belongs to a different user", async () => {
    const data = await loadReportData(fakeSupabase(baseTables()), RUN_ID, {
      requireUserId: "someone-else",
    });

    expect(data).toBeNull();
  });

  it("loads the run when requireUserId matches the owner", async () => {
    const data = await loadReportData(fakeSupabase(baseTables()), RUN_ID, {
      requireUserId: USER_ID,
    });

    expect(data?.runId).toBe(RUN_ID);
  });

  it("returns null when the run is not completed", async () => {
    const data = await loadReportData(
      fakeSupabase(baseTables({ simulation_runs: [runRow({ status: "in_progress" })] })),
      RUN_ID
    );

    expect(data).toBeNull();
  });

  it("returns null when the participant record is missing", async () => {
    const data = await loadReportData(
      fakeSupabase(baseTables({ users: [] })),
      RUN_ID
    );

    expect(data).toBeNull();
  });

  it("falls back to engine defaults when there are no KPI snapshots", async () => {
    const data = await loadReportData(fakeSupabase(baseTables()), RUN_ID);

    expect(data?.baselineKPIs).toEqual(buildInitialKPIs());
    expect(data?.finalKPIs).toEqual(buildInitialKPIs());
    expect(data?.finalScores).toEqual({});
    expect(data?.kpiTrajectory).toEqual([
      { label: "Baseline", values: buildInitialKPIs() },
    ]);
  });

  it("builds the KPI trajectory from initial plus per-round snapshots", async () => {
    const baseline = { ...buildInitialKPIs(), digital_maturity: 45 };
    const afterRound1 = { ...baseline, digital_maturity: 55 };
    const afterRound3 = { ...baseline, digital_maturity: 80 };

    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          kpi_snapshots: [
            {
              simulation_run_id: RUN_ID,
              snapshot_type: "initial",
              scenario_round_id: null,
              kpi_values_json: baseline,
            },
            {
              simulation_run_id: RUN_ID,
              snapshot_type: "round_end",
              scenario_round_id: "round-1-id",
              kpi_values_json: afterRound1,
            },
            {
              simulation_run_id: RUN_ID,
              snapshot_type: "round_end",
              scenario_round_id: "round-3-id",
              kpi_values_json: afterRound3,
            },
          ],
          score_snapshots: [
            {
              simulation_run_id: RUN_ID,
              scenario_round_id: "round-3-id",
              snapshot_type: "round_end",
              score_values_json: { enterprise_judgment: 14 },
            },
          ],
        })
      ),
      RUN_ID
    );

    expect(data?.kpiTrajectory.map((t) => t.label)).toEqual([
      "Baseline",
      "Round 1",
      "Round 3",
    ]);
    expect(data?.finalKPIs.digital_maturity).toBe(80);
    expect(data?.finalScores).toEqual({ enterprise_judgment: 14 });
  });

  it("resolves the profile from the DB profile id through content profiles", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          simulation_runs: [runRow({ final_profile_id: "profile-uuid" })],
          performance_profiles: [
            { id: "profile-uuid", key: "data_enabled_builder" },
          ],
        })
      ),
      RUN_ID
    );

    expect(data?.profile?.key).toBe("data_enabled_builder");
  });

  it("leaves the profile null when the assigned id has no matching row", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          simulation_runs: [runRow({ final_profile_id: "missing-uuid" })],
          performance_profiles: [{ id: "other-uuid", key: "cautious_operator" }],
        })
      ),
      RUN_ID
    );

    expect(data?.profile).toBeNull();
  });

  it("maps responses to authored labels and sorts them by content sort order", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          decision_responses: [
            {
              simulation_run_id: RUN_ID,
              decision_template_id: "tpl-comm",
              scenario_round_id: "round-1-id",
              selected_option_ids_json: ["r1_comm_direct"],
              allocation_json: null,
              short_rationale_text: "Trust first",
            },
            {
              simulation_run_id: RUN_ID,
              decision_template_id: "tpl-pri",
              scenario_round_id: "round-1-id",
              selected_option_ids_json: ["r1_pri_digital", "unknown_option"],
              allocation_json: null,
              short_rationale_text: null,
            },
          ],
        })
      ),
      RUN_ID
    );

    const roundOne = data?.decisionsByRound.get(1) ?? [];

    expect(roundOne.map((d) => d.templateKey)).toEqual([
      "r1_prioritization",
      "r1_communication",
    ]);
    expect(roundOne[0].templateTitle).toBe("90-Day Priority Focus");
    expect(roundOne[0].decisionType).toBe("multi_select");
    expect(roundOne[0].optionLabels).toEqual([
      "Accelerate digital transformation",
      "unknown_option",
    ]);
    expect(roundOne[0].rationale).toBeNull();
    expect(roundOne[1].rationale).toBe("Trust first");
  });

  it("renders allocation lines from highest to lowest percent", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          decision_responses: [
            {
              simulation_run_id: RUN_ID,
              decision_template_id: "tpl-cap",
              scenario_round_id: "round-1-id",
              selected_option_ids_json: ["r1_cap_digital", "r1_cap_talent"],
              allocation_json: { r1_cap_talent: 30, r1_cap_digital: 70 },
              short_rationale_text: null,
            },
          ],
        })
      ),
      RUN_ID
    );

    const entry = (data?.decisionsByRound.get(1) ?? [])[0];

    expect(entry.allocationLines).toHaveLength(2);
    expect(entry.allocationLines[0]).toMatch(/: 70%$/);
    expect(entry.allocationLines[1]).toMatch(/: 30%$/);
  });

  it("groups an unrecognized template into round 0 with the raw key as title", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          decision_responses: [
            {
              simulation_run_id: RUN_ID,
              decision_template_id: "tpl-unknown",
              scenario_round_id: "round-unknown-id",
              selected_option_ids_json: [],
              allocation_json: null,
              short_rationale_text: null,
            },
          ],
        })
      ),
      RUN_ID
    );

    const orphans = data?.decisionsByRound.get(0) ?? [];

    expect(orphans).toHaveLength(1);
    expect(orphans[0].templateTitle).toBe("");
    expect(orphans[0].decisionType).toBe("");
  });

  it("maps the executive recommendation into camelCase fields", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          executive_recommendations: [
            {
              simulation_run_id: RUN_ID,
              prioritized_strategy: "Stabilize compliance",
              action_plan_90_day: "Weekly audit reviews",
              key_risks: "Regulator escalation",
              talent_implications: "Backfill operations lead",
              communication_approach: "Direct and frequent",
            },
          ],
        })
      ),
      RUN_ID
    );

    expect(data?.recommendation).toEqual({
      prioritizedStrategy: "Stabilize compliance",
      actionPlan90Day: "Weekly audit reviews",
      keyRisks: "Regulator escalation",
      talentImplications: "Backfill operations lead",
      communicationApproach: "Direct and frequent",
    });
  });

  it("returns null recommendation and empty self assessment when neither was submitted", async () => {
    const data = await loadReportData(fakeSupabase(baseTables()), RUN_ID);

    expect(data?.recommendation).toBeNull();
    expect(data?.selfAssessment).toEqual({});
  });

  it("builds the participant full name and passes the cohort through", async () => {
    const data = await loadReportData(fakeSupabase(baseTables()), RUN_ID);

    expect(data?.participant.fullName).toBe("Dana Reyes");
    expect(data?.cohort).toEqual({ id: "cohort-1", name: "Spring Academy" });
  });

  it("falls back to the email when the participant has no name", async () => {
    const data = await loadReportData(
      fakeSupabase(
        baseTables({
          users: [
            {
              id: USER_ID,
              first_name: null,
              last_name: null,
              email: "dana@example.com",
            },
          ],
          cohorts: [],
        })
      ),
      RUN_ID
    );

    expect(data?.participant.fullName).toBe("dana@example.com");
    expect(data?.cohort).toBeNull();
  });
});
