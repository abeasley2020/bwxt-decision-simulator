/**
 * Participant Readiness — /admin/cohorts/[cohortId]/readiness
 *
 * Shows completion metrics and a full participant table with:
 *  - Name / email
 *  - Status (not started / in progress / completed)
 *  - Last active timestamp
 *  - Completion date
 *
 * Highlights participants who have not started with less than 3 days until
 * the simulator deadline (shown with an "At risk" badge + highlighted row).
 * At-risk participants are sorted to the top of the table.
 *
 * Includes a placeholder "Export CSV" button that shows a notice (no actual
 * export in MVP).
 *
 * Access control: admin only.
 *
 * WCAG: h1→h2 heading hierarchy; progress bar with role="progressbar" and
 * aria-labels; "At risk" conveyed by text badge (not color alone); table
 * has caption + th scope; role="alert" on at-risk summary; ExportButton uses
 * role="status" on its notice.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExportButton from "./ExportButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReadinessPage({
  params,
}: {
  params: { cohortId: string };
}) {
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

  if (!userRow || userRow.role !== "admin") {
    redirect(userRow?.role === "faculty" ? "/faculty/dashboard" : "/simulation");
  }

  // ── Load cohort ──────────────────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, simulator_deadline")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) notFound();

  // ── Load participants ─────────────────────────────────────────────────────

  const { data: memberships } = await supabase
    .from("cohort_memberships")
    .select("user_id, users(id, first_name, last_name, email)")
    .eq("cohort_id", params.cohortId)
    .eq("cohort_role", "participant");

  type MemberRow = {
    user_id: string;
    users: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  };

  const participantIds = (memberships as MemberRow[] ?? []).map((m) => m.user_id);

  const { data: runs } =
    participantIds.length > 0
      ? await supabase
          .from("simulation_runs")
          .select("user_id, status, last_active_at, completed_at")
          .eq("cohort_id", params.cohortId)
          .eq("is_preview", false)
          .in("user_id", participantIds)
      : { data: [] };

  const runsByUser = new Map(
    (runs ?? []).map(
      (r: {
        user_id: string;
        status: string;
        last_active_at: string | null;
        completed_at: string | null;
      }) => [r.user_id, r]
    )
  );

  // ── Compute at-risk window ────────────────────────────────────────────────

  const now = Date.now();
  const deadlineMs = cohort.simulator_deadline
    ? new Date(cohort.simulator_deadline).getTime()
    : null;
  // At risk = deadline is in the future AND less than 3 days away
  const deadlineNear =
    deadlineMs !== null &&
    deadlineMs > now &&
    deadlineMs - now < THREE_DAYS_MS;

  // ── Build rows ────────────────────────────────────────────────────────────

  const rows = (memberships as MemberRow[] ?? [])
    .map((m) => {
      const u = m.users[0] ?? null;
      const run = runsByUser.get(m.user_id);
      const status: "completed" | "in_progress" | "not_started" =
        run?.status === "completed"
          ? "completed"
          : run?.status === "in_progress"
          ? "in_progress"
          : "not_started";

      return {
        userId: m.user_id,
        name: u ? `${u.first_name} ${u.last_name}`.trim() : "Unknown",
        email: u?.email ?? "—",
        status,
        lastActive: run?.last_active_at ?? null,
        completedAt: run?.completed_at ?? null,
        atRisk: status === "not_started" && deadlineNear,
      };
    })
    .sort((a, b) => {
      // At-risk participants sort first; then not_started, in_progress, completed
      if (a.atRisk && !b.atRisk) return -1;
      if (!a.atRisk && b.atRisk) return 1;
      const order: Record<string, number> = {
        not_started: 0,
        in_progress: 1,
        completed: 2,
      };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

  // ── Summary counts ────────────────────────────────────────────────────────

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const notStarted = rows.filter((r) => r.status === "not_started").length;
  const atRiskCount = rows.filter((r) => r.atRisk).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

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
      {/* ── Back link + heading ──────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={`/admin/cohorts/${cohort.id}`}
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Cohort
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">
              Participant Readiness
            </h1>
            <p className="text-gray-500 text-sm mt-1">{cohort.name}</p>
          </div>
          <ExportButton />
        </div>
      </div>

      {/* ── Completion summary ───────────────────────────────────────────── */}
      <section aria-labelledby="completion-heading" className="mb-8">
        <h2
          id="completion-heading"
          className="text-lg font-bold text-brand-navy mb-4"
        >
          Completion Summary
        </h2>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total", value: total, accent: "text-brand-navy" },
            { label: "Completed", value: completed, accent: "text-green-700" },
            {
              label: "In Progress",
              value: inProgress,
              accent: "text-brand-blue",
            },
            {
              label: "Not Started",
              value: notStarted,
              accent: "text-gray-500",
            },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {label}
              </div>
              <div
                className={`text-3xl font-bold tabular-nums ${accent}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-brand-navy">
              Completion rate
            </span>
            <span className="text-sm font-bold text-brand-navy tabular-nums">
              {pct}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Cohort completion: ${pct}% — ${completed} of ${total} participants`}
            className="h-3 bg-gray-100 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {total === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              No participants assigned to this cohort yet.
            </p>
          )}
        </div>

        {/* At-risk alert */}
        {atRiskCount > 0 && (
          <div
            role="alert"
            className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2"
          >
            <span aria-hidden="true" className="text-red-500 font-bold mt-0.5 shrink-0">
              !
            </span>
            <p className="text-sm text-red-700">
              <strong>
                {atRiskCount} participant{atRiskCount !== 1 ? "s" : ""}
              </strong>{" "}
              {atRiskCount === 1 ? "has" : "have"} not started with less than 3
              days until the simulator deadline.
            </p>
          </div>
        )}
      </section>

      {/* ── Participant table ────────────────────────────────────────────── */}
      <section aria-labelledby="readiness-table-heading">
        <h2
          id="readiness-table-heading"
          className="text-lg font-bold text-brand-navy mb-4"
        >
          Participants
        </h2>

        {rows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            No participants assigned to this cohort.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <caption className="sr-only">
                Participant readiness for {cohort.name}. At-risk participants
                (not started, deadline within 3 days) are listed first.
              </caption>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    scope="col"
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Name / Email
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
                    Last Active
                  </th>
                  <th
                    scope="col"
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.userId}
                    className={`hover:bg-gray-50/50 ${
                      row.atRisk ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap font-medium text-brand-navy">
                        {row.name}
                        {row.atRisk && (
                          <span
                            className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700"
                            aria-label="At risk: not started, simulator deadline within 3 days"
                          >
                            At risk
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {row.email}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`
                          inline-block text-xs font-semibold px-2 py-0.5 rounded-full
                          ${statusClass[row.status]}
                        `}
                      >
                        {/* Text label satisfies WCAG 1.4.1 — not color alone */}
                        {statusLabel[row.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs tabular-nums">
                      {formatDateTime(row.lastActive)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs tabular-nums">
                      {formatDateTime(row.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
