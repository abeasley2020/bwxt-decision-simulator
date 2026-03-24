/**
 * Faculty Participant List — /faculty/participants
 *
 * Displays all participants in the faculty member's cohort with:
 *  - Name, email, status, completion date, assigned profile, link to detail.
 *
 * Sort order: completed → in_progress → not_started.
 *
 * Access control: faculty and admin only.
 * Data: server-side only, read-only.
 *
 * WCAG: table with caption, th scope, and header row; status conveyed by
 * text badge not color alone; keyboard-accessible links with visible focus.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveFacultyCohort } from "@/lib/faculty/getActiveFacultyCohort";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_ORDER: Record<string, number> = {
  completed: 0,
  in_progress: 1,
  not_started: 2,
};

const profileLabelMap = new Map(
  PERFORMANCE_PROFILES.map((p) => [p.key, p.label])
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParticipantListPage() {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role === "participant") {
    redirect("/simulation");
  }

  // ── Cohort selection ────────────────────────────────────────────────────────

  const cohort = await getActiveFacultyCohort(supabase, user.id);

  if (!cohort) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-navy mb-3">
          No Cohort Assigned
        </h1>
        <p className="text-gray-500 text-sm">
          Contact your administrator to be assigned to a cohort.
        </p>
      </main>
    );
  }

  // ── Load participants ─────────────────────────────────────────────────────

  const [membershipsRes, profilesRes] = await Promise.all([
    supabase
      .from("cohort_memberships")
      .select("user_id, users(id, first_name, last_name, email)")
      .eq("cohort_id", cohort.id)
      .eq("cohort_role", "participant"),
    supabase.from("performance_profiles").select("id, key, label"),
  ]);

  // Supabase embedded joins return arrays even for one-to-one FK relationships
  const memberships: Array<{
    user_id: string;
    users: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  }> = (membershipsRes.data ?? []) as Array<{
    user_id: string;
    users: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  }>;

  const participantUserIds = memberships.map((m) => m.user_id);

  // ── Load simulation runs for this cohort ──────────────────────────────────

  const { data: runsData } = await supabase
    .from("simulation_runs")
    .select("id, user_id, status, final_profile_id, completed_at")
    .eq("cohort_id", cohort.id)
    .eq("is_preview", false)
    .in("user_id", participantUserIds.length > 0 ? participantUserIds : ["none"]);

  const runsByUser = new Map(
    (runsData ?? []).map((r: {
      id: string;
      user_id: string;
      status: string;
      final_profile_id: string | null;
      completed_at: string | null;
    }) => [r.user_id, r])
  );

  // ── Build profile label map from DB (authoritative for assigned IDs) ──────

  const dbProfileMap = new Map(
    (profilesRes.data ?? []).map((p: { id: string; key: string; label: string }) => [
      p.id,
      profileLabelMap.get(p.key as import("@/engine/types").PerformanceProfileKey) ??
        p.label,
    ])
  );

  // ── Build row data ────────────────────────────────────────────────────────

  const rows = memberships
    .map((m) => {
      // Supabase embedded join returns an array; take first element
      const u = m.users[0] ?? null;
      const run = runsByUser.get(m.user_id);
      const status: "completed" | "in_progress" | "not_started" =
        run?.status === "completed"
          ? "completed"
          : run?.status === "in_progress"
          ? "in_progress"
          : "not_started";
      const profileLabel =
        run?.final_profile_id
          ? (dbProfileMap.get(run.final_profile_id) ?? "—")
          : "—";

      return {
        userId: m.user_id,
        runId: run?.id ?? null,
        name: u ? `${u.first_name} ${u.last_name}`.trim() : "Unknown",
        email: u?.email ?? "—",
        status,
        completedAt: run?.completed_at ?? null,
        profileLabel,
      };
    })
    .sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    );

  const statusLabel: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    not_started: "Not Started",
  };

  const statusClass: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    not_started: "bg-gray-100 text-gray-600",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/faculty/dashboard"
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy mt-2 mb-1">
          Participants
        </h1>
        <p className="text-gray-500 text-sm">
          {cohort.name} &mdash; {rows.length} participant
          {rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Participant table ────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">
          No participants have been assigned to this cohort yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <caption className="sr-only">
              Participant list for {cohort.name}, sorted by completion status
            </caption>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Completed
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Profile
                </th>
                <th
                  scope="col"
                  className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.userId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-brand-navy">
                    {row.name}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {row.email}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`
                        inline-block text-xs font-semibold px-2 py-0.5 rounded-full
                        ${statusClass[row.status] ?? "bg-gray-100 text-gray-600"}
                      `}
                    >
                      {/* Text label — not color alone — satisfies WCAG 1.4.1 */}
                      {statusLabel[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 tabular-nums text-xs">
                    {formatDateTime(row.completedAt)}
                  </td>
                  <td className="px-5 py-3 text-gray-700 text-xs">
                    {row.profileLabel}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/faculty/participants/${row.userId}`}
                      className="
                        text-brand-blue text-xs font-medium hover:underline
                        focus:outline-none focus:ring-2 focus:ring-brand-gold
                        focus:ring-offset-1 rounded whitespace-nowrap
                      "
                      aria-label={`View profile for ${row.name}`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
