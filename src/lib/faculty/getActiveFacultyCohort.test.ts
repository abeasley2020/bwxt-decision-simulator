import { describe, expect, it } from "vitest";

import { getActiveFacultyCohort } from "./getActiveFacultyCohort";

interface TableRows {
  cohort_memberships?: unknown[] | null;
  cohorts?: unknown[] | null;
}

/**
 * Minimal stand-in for the Supabase query builder: filter methods are no-ops
 * that return the builder, and awaiting it resolves to the configured rows.
 */
function fakeSupabase(rows: TableRows) {
  return {
    from(table: keyof TableRows) {
      const data = rows[table] ?? null;
      const builder: Record<string, unknown> = {
        then(resolve: (value: { data: unknown[] | null }) => unknown) {
          return Promise.resolve({ data }).then(resolve);
        },
      };
      for (const method of ["select", "eq", "in", "neq", "order"]) {
        builder[method] = () => builder;
      }
      return builder;
    },
  };
}

function cohort(id: string, status: "active" | "closed") {
  return {
    id,
    name: `Cohort ${id}`,
    academy_start_date: null,
    academy_end_date: null,
    status,
    scenario_version_id: "version-1",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("getActiveFacultyCohort", () => {
  it("returns null when the user has no faculty or admin memberships", async () => {
    const supabase = fakeSupabase({ cohort_memberships: [] });

    await expect(getActiveFacultyCohort(supabase, "user-1")).resolves.toBeNull();
  });

  it("returns null when the membership query yields no data", async () => {
    const supabase = fakeSupabase({ cohort_memberships: null });

    await expect(getActiveFacultyCohort(supabase, "user-1")).resolves.toBeNull();
  });

  it("returns null when no non-draft cohorts remain", async () => {
    const supabase = fakeSupabase({
      cohort_memberships: [{ cohort_id: "c1" }],
      cohorts: [],
    });

    await expect(getActiveFacultyCohort(supabase, "user-1")).resolves.toBeNull();
  });

  it("prefers the active cohort over a more recently updated closed one", async () => {
    const supabase = fakeSupabase({
      cohort_memberships: [{ cohort_id: "c1" }, { cohort_id: "c2" }],
      cohorts: [cohort("c1", "closed"), cohort("c2", "active")],
    });

    const result = await getActiveFacultyCohort(supabase, "user-1");

    expect(result?.id).toBe("c2");
  });

  it("falls back to the first cohort returned when none are active", async () => {
    const supabase = fakeSupabase({
      cohort_memberships: [{ cohort_id: "c1" }],
      cohorts: [cohort("c1", "closed"), cohort("c2", "closed")],
    });

    const result = await getActiveFacultyCohort(supabase, "user-1");

    expect(result?.id).toBe("c1");
  });
});
