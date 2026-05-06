/**
 * Admin Dashboard — /admin/dashboard
 *
 * Lists all cohorts with status, participant count, completion percentage,
 * and academy start date. Provides a "Create New Cohort" action.
 *
 * Access control: admin only.
 *  - Faculty → /faculty/dashboard
 *  - Participants → /simulation
 *
 * WCAG: table with caption, th scope; status badges use text + color;
 * all interactive elements keyboard accessible with visible focus rings.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "closed") return "bg-gray-100 text-gray-600";
  return "bg-yellow-100 text-yellow-800";
}

function statusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "closed") return "Closed";
  return "Draft";
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
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

  if (!userRow) redirect("/login");
  if (userRow.role === "faculty") redirect("/faculty/dashboard");
  if (userRow.role === "participant") redirect("/simulation");

  // ── Load all cohorts ─────────────────────────────────────────────────────

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, status, academy_start_date")
    .order("created_at", { ascending: false });

  const cohortList = cohorts ?? [];
  const cohortIds = cohortList.map((c) => c.id);

  // ── Load participant + completion counts ──────────────────────────────────

  const membershipCounts: Record<string, number> = {};
  const completionCounts: Record<string, number> = {};

  if (cohortIds.length > 0) {
    const [membershipsRes, runsRes] = await Promise.all([
      supabase
        .from("cohort_memberships")
        .select("cohort_id")
        .in("cohort_id", cohortIds)
        .eq("cohort_role", "participant"),
      supabase
        .from("simulation_runs")
        .select("cohort_id")
        .in("cohort_id", cohortIds)
        .eq("status", "completed"),
    ]);

    for (const m of membershipsRes.data ?? []) {
      membershipCounts[m.cohort_id] =
        (membershipCounts[m.cohort_id] ?? 0) + 1;
    }
    for (const r of runsRes.data ?? []) {
      completionCounts[r.cohort_id] =
        (completionCounts[r.cohort_id] ?? 0) + 1;
    }
  }

  // ── Recent reports (admin client — RLS hides other users on the
  // user-scoped client) ─────────────────────────────────────────────────────

  type RecentReport = {
    userId: string;
    fullName: string;
    email: string;
    cohortName: string | null;
    completedAt: string | null;
  };

  let recentReports: RecentReport[] = [];

  if (cohortIds.length > 0) {
    const adminSupabase = createAdminClient();
    const { data: recentRuns } = await adminSupabase
      .from("simulation_runs")
      .select(
        "user_id, completed_at, users(first_name, last_name, email), cohorts(name)"
      )
      .eq("status", "completed")
      .eq("is_preview", false)
      .order("completed_at", { ascending: false })
      .limit(5);

    type RecentRow = {
      user_id: string;
      completed_at: string | null;
      users:
        | { first_name: string | null; last_name: string | null; email: string }
        | Array<{ first_name: string | null; last_name: string | null; email: string }>
        | null;
      cohorts: { name: string } | Array<{ name: string }> | null;
    };

    recentReports = ((recentRuns ?? []) as RecentRow[]).map((r) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      const c = Array.isArray(r.cohorts) ? r.cohorts[0] : r.cohorts;
      const fullName =
        [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
        u?.email ||
        "Unknown";
      return {
        userId: r.user_id,
        fullName,
        email: u?.email ?? "—",
        cohortName: c?.name ?? null,
        completedAt: r.completed_at,
      };
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* ── Page heading ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-brand-navy">Cohorts</h1>
        <Link
          href="/admin/cohorts/new"
          className="
            px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-md
            hover:bg-brand-blue/90 transition-colors
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          "
        >
          + Create New Cohort
        </Link>
      </div>

      {/* ── Cohort list ─────────────────────────────────────────────────── */}
      {cohortList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            No cohorts yet. Create one to get started.
          </p>
          <Link
            href="/admin/cohorts/new"
            className="
              text-brand-blue text-sm font-medium hover:underline
              focus:outline-none focus:ring-2 focus:ring-brand-gold rounded
            "
          >
            Create your first cohort →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">
              All cohorts with status, participant count, completion rate, and
              academy start date
            </caption>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Cohort
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Participants
                </th>
                <th
                  scope="col"
                  className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Completion
                </th>
                <th
                  scope="col"
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Academy Start
                </th>
                <th scope="col" className="px-5 py-3 w-24">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohortList.map((cohort) => {
                const total = membershipCounts[cohort.id] ?? 0;
                const completed = completionCounts[cohort.id] ?? 0;
                const pct =
                  total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <tr key={cohort.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium text-brand-navy">
                      {cohort.name}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-block text-xs font-semibold px-2.5 py-0.5
                          rounded-full uppercase tracking-wide
                          ${statusBadgeClass(cohort.status)}
                        `}
                        aria-label={`Status: ${statusLabel(cohort.status)}`}
                      >
                        {/* Text label so status is not conveyed by color alone */}
                        {statusLabel(cohort.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {total}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {total > 0 ? `${pct}% (${completed}/${total})` : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(cohort.academy_start_date)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/cohorts/${cohort.id}`}
                        className="
                          text-brand-blue text-xs font-medium hover:underline
                          focus:outline-none focus:ring-2 focus:ring-brand-gold
                          focus:ring-offset-1 rounded whitespace-nowrap
                        "
                        aria-label={`Manage cohort: ${cohort.name}`}
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent Reports ──────────────────────────────────────────────── */}
      <section aria-labelledby="recent-reports-heading" className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="recent-reports-heading"
            className="text-lg font-bold text-brand-navy"
          >
            Recent Reports
          </h2>
          <Link
            href="/admin/participants"
            className="
              text-xs text-brand-blue font-medium hover:underline
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
            "
          >
            All participants →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">
              No completed reports yet. Reports appear here once participants
              finish their simulation and submit the executive recommendation.
            </p>
          </div>
        ) : (
          <ul
            className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100"
            aria-label="Most recently completed reports"
          >
            {recentReports.map((r) => (
              <li
                key={`${r.userId}-${r.completedAt ?? ""}`}
                className="flex items-center gap-4 px-5 py-4 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold text-brand-navy">
                    {r.fullName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.email}
                    {r.cohortName ? ` · ${r.cohortName}` : ""}
                  </div>
                </div>
                <div className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                  {formatDate(r.completedAt)}
                </div>
                <Link
                  href={`/admin/participants/${r.userId}/report`}
                  className="
                    text-xs font-semibold text-brand-navy hover:underline whitespace-nowrap
                    focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
                  "
                  aria-label={`View report for ${r.fullName}`}
                >
                  View report →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
