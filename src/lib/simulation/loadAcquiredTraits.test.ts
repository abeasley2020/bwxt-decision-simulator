import { describe, expect, it } from "vitest";

import { loadAcquiredTraits } from "./loadAcquiredTraits";

interface TableRows {
  scenario_rounds?: unknown[];
  decision_templates?: unknown[];
  decision_responses?: unknown[];
}

/**
 * Minimal stand-in for the Supabase query builder: every filter method is a
 * no-op that returns the builder, and awaiting it resolves to the rows
 * configured for that table.
 */
function fakeSupabase(rows: TableRows) {
  const calls: string[] = [];

  return {
    calls,
    from(table: keyof TableRows) {
      calls.push(table);
      const data = rows[table] ?? [];
      const builder: Record<string, unknown> = {
        then(resolve: (value: { data: unknown[] }) => unknown) {
          return Promise.resolve({ data }).then(resolve);
        },
      };
      for (const method of ["select", "eq", "in", "order"]) {
        builder[method] = () => builder;
      }
      return builder;
    },
  };
}

const SCENARIO_VERSION_ID = "version-1";
const RUN_ID = "run-1";

const ROUND_ROWS = [{ id: "round-1-id", round_number: 1 }];
const TEMPLATE_ROWS = [
  { id: "template-pri", key: "r1_prioritization" },
  { id: "template-comm", key: "r1_communication" },
];

function responseRow(
  templateId: string,
  optionKeys: string[],
  overrides: Record<string, unknown> = {}
) {
  return {
    decision_template_id: templateId,
    scenario_round_id: "round-1-id",
    selected_option_ids_json: optionKeys,
    allocation_json: null,
    responded_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("loadAcquiredTraits", () => {
  it("replays stored responses through the engine and returns the acquired traits", async () => {
    const supabase = fakeSupabase({
      scenario_rounds: ROUND_ROWS,
      decision_templates: TEMPLATE_ROWS,
      decision_responses: [
        responseRow("template-pri", ["r1_pri_digital"]),
        responseRow("template-comm", ["r1_comm_direct"]),
      ],
    });

    const traits = await loadAcquiredTraits(
      supabase,
      RUN_ID,
      SCENARIO_VERSION_ID
    );

    expect(traits).toEqual(["digital_first_leader", "transparent_communicator"]);
  });

  it("returns an empty list when the run has no responses", async () => {
    const supabase = fakeSupabase({
      scenario_rounds: ROUND_ROWS,
      decision_templates: TEMPLATE_ROWS,
      decision_responses: [],
    });

    await expect(
      loadAcquiredTraits(supabase, RUN_ID, SCENARIO_VERSION_ID)
    ).resolves.toEqual([]);
  });

  it("skips responses whose template or round cannot be resolved", async () => {
    const supabase = fakeSupabase({
      scenario_rounds: ROUND_ROWS,
      decision_templates: TEMPLATE_ROWS,
      decision_responses: [
        responseRow("template-unknown", ["r1_pri_digital"]),
        responseRow("template-pri", ["r1_pri_talent"], {
          scenario_round_id: "round-unknown-id",
        }),
      ],
    });

    await expect(
      loadAcquiredTraits(supabase, RUN_ID, SCENARIO_VERSION_ID)
    ).resolves.toEqual([]);
  });

  it("tolerates null result sets from every query", async () => {
    const supabase = {
      from: () => {
        const builder: Record<string, unknown> = {
          then(resolve: (value: { data: null }) => unknown) {
            return Promise.resolve({ data: null }).then(resolve);
          },
        };
        for (const method of ["select", "eq", "in", "order"]) {
          builder[method] = () => builder;
        }
        return builder;
      },
    };

    await expect(
      loadAcquiredTraits(supabase, RUN_ID, SCENARIO_VERSION_ID)
    ).resolves.toEqual([]);
  });

  it("queries rounds, templates, and responses", async () => {
    const supabase = fakeSupabase({
      scenario_rounds: ROUND_ROWS,
      decision_templates: TEMPLATE_ROWS,
      decision_responses: [],
    });

    await loadAcquiredTraits(supabase, RUN_ID, SCENARIO_VERSION_ID);

    expect(supabase.calls).toEqual([
      "scenario_rounds",
      "decision_templates",
      "decision_responses",
    ]);
  });
});
