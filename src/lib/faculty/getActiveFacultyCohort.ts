/**
 * Faculty cohort selection helper.
 *
 * Finds the most relevant cohort for a faculty/admin user:
 *  - Prefers the active cohort if one exists.
 *  - Otherwise returns the most recently updated non-draft cohort.
 *  - Returns null if the user has no faculty/admin memberships.
 */

export interface FacultyCohort {
  id: string;
  name: string;
  academy_start_date: string | null;
  academy_end_date: string | null;
  status: "draft" | "active" | "closed";
  scenario_version_id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveFacultyCohort(
  supabase: any,
  userId: string
): Promise<FacultyCohort | null> {
  const { data: memberships } = await supabase
    .from("cohort_memberships")
    .select("cohort_id")
    .eq("user_id", userId)
    .in("cohort_role", ["faculty", "admin"]);

  const cohortIds = (memberships ?? []).map(
    (m: { cohort_id: string }) => m.cohort_id
  );
  if (cohortIds.length === 0) return null;

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select(
      "id, name, academy_start_date, academy_end_date, status, scenario_version_id, updated_at"
    )
    .in("id", cohortIds)
    .neq("status", "draft")
    .order("updated_at", { ascending: false });

  if (!cohorts?.length) return null;

  // Prefer active cohort; fall back to most recently updated
  const active = cohorts.find(
    (c: { status: string }) => c.status === "active"
  );
  return (active ?? cohorts[0]) as FacultyCohort;
}
