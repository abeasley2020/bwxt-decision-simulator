/**
 * Faculty Dashboard — /faculty/dashboard
 *
 * Cohort-level overview for faculty and admin users.
 * Shows completion summary, KPI averages, score averages, and profile distribution
 * for the faculty member's most recently active cohort.
 *
 * Access control: faculty and admin only. Participants redirected to /simulation.
 * Data: server-side only. Read-only — no participant data is modified.
 *
 * WCAG: semantic landmarks; h1→h2→h3 heading hierarchy; progress bars with
 * role="progressbar" and aria-labels; status badges use text+color (not color alone);
 * all interactive links keyboard accessible with visible focus rings.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveFacultyCohort } from "@/lib/faculty/getActiveFacultyCohort";
import { KPI_DEFINITIONS } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import type { KPIKey, KPIValues, ScoringDimensionKey, ScoreValues } from "@/engine/types";

// ─── Inline averaging helpers ────────────────────────────────────────────────

function avgKPIs(
  snapshots: Array<{ kpi_values_json: Record<string, number> }>
): KPIValues | null {
  if (snapshots.length === 0) return null;
  const keys = Object.keys(KPI_DEFINITIONS) as KPIKey[];
  return Object.fromEntries(
    keys.map((k) => [
      k,
      Math.round(
        snapshots.reduce((sum, s) => sum + (s.kpi_values_json[k] ?? 0), 0) /
          snapshots.length
      ),
    ])
  ) as KPIValues;
}

function avgScores(
  snapshots: Array<{ score_values_json: Record<string, number> }>
): ScoreValues | null {
  if (snapshots.length === 0) return null;
  const keys = Object.keys(SCORING_DIMENSIONS) as ScoringDimensionKey[];
  return Object.fromEntries(
    keys.map((k) => [
      k,
      Math.round(
        snapshots.reduce((sum, s) => sum + (s.score_values_json[k] ?? 0), 0) /
          snapshots.length
      ),
    ])
  ) as ScoreValues;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FacultyDashboardPage() {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role, first_name, last_name")
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
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          You are not assigned to any active cohort as faculty. Contact your
          administrator to be assigned to a cohort.
        </p>
      </main>
    );
  }

  // ── Load cohort data in parallel ─────────────────────────────────────────────

  const [participantMembershipsRes, runsRes, scenarioRoundsRes, profilesRes] =
    await Promise.all([
      // All participants in this cohort
      supabase
        .from("cohort_memberships")
        .select("user_id")
        .eq("cohort_id", cohort.id)
        .eq("cohort_role", "participant"),

      // All simulation runs for this cohort, excluding admin preview runs
      supabase
        .from("simulation_runs")
        .select("id, user_id, status, final_profile_id, completed_at")
        .eq("cohort_id", cohort.id)
        .eq("is_preview", false),

      // Scenario rounds to find round 3 ID
      supabase
        .from("scenario_rounds")
        .select("id, round_number")
        .eq("scenario_version_id", cohort.scenario_version_id)
        .order("round_number"),

      // Performance profiles for profile key/label lookup
      supabase.from("performance_profiles").select("id, key, label"),
    ]);

  // ── Build status counts ───────────────────────────────────────────────────

  const participantUserIds = (participantMembershipsRes.data ?? []).map(
    (m: { user_id: string }) => m.user_id
  );
  const allRuns: Array<{
    id: string;
    user_id: string;
    status: string;
    final_profile_id: string | null;
    completed_at: string | null;
  }> = runsRes.data ?? [];

  const runsByUser = new Map(allRuns.map((r) => [r.user_id, r]));
  const completedRuns = allRuns.filter((r) => r.status === "completed");
  const inProgressRuns = allRuns.filter((r) => r.status === "in_progress");

  const total = participantUserIds.length;
  const completedCount = completedRuns.length;
  const inProgressCount = inProgressRuns.length;
  const notStartedCount = participantUserIds.filter((uid) => {
    const run = runsByUser.get(uid);
    return !run || run.status === "not_started";
  }).length;
  const completionRate =
    total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // ── Load KPI + score snapshots for completed runs ──────────────────────────

  let kpiAverages: KPIValues | null = null;
  let scoreAverages: ScoreValues | null = null;

  const completedRunIds = completedRuns.map((r) => r.id);
  const round3Id = (scenarioRoundsRes.data ?? []).find(
    (r: { round_number: number }) => r.round_number === 3
  )?.id as string | undefined;

  if (completedRunIds.length > 0 && round3Id) {
    const [kpiSnapshotsRes, scoreSnapshotsRes] = await Promise.all([
      supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .in("simulation_run_id", completedRunIds)
        .eq("scenario_round_id", round3Id)
        .eq("snapshot_type", "round_end"),
      supabase
        .from("score_snapshots")
        .select("score_values_json")
        .in("simulation_run_id", completedRunIds)
        .eq("scenario_round_id", round3Id)
        .eq("snapshot_type", "round_end"),
    ]);

    kpiAverages = avgKPIs(kpiSnapshotsRes.data ?? []);
    scoreAverages = avgScores(scoreSnapshotsRes.data ?? []);
  }

  // ── Profile distribution ──────────────────────────────────────────────────

  const profileRows: Array<{ id: string; key: string; label: string }> =
    profilesRes.data ?? [];
  const profileMap = new Map(
    profileRows.map((p) => [p.id, { key: p.key, label: p.label }])
  );

  const profileCountMap = new Map<
    string,
    { key: string; label: string; count: number }
  >();
  for (const run of completedRuns) {
    if (run.final_profile_id) {
      const profile = profileMap.get(run.final_profile_id);
      if (profile) {
        const existing = profileCountMap.get(profile.key);
        profileCountMap.set(profile.key, {
          key: profile.key,
          label: profile.label,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
  }

  const profileDistribution = Array.from(profileCountMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // ── Score bar scale ───────────────────────────────────────────────────────

  const maxScoreAvg = scoreAverages
    ? Math.max(...(Object.values(scoreAverages) as number[]), 1)
    : 1;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Cohort header ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-1">
              {cohort.name}
            </h1>
            <p className="text-gray-500 text-sm">
              {cohort.academy_start_date || cohort.academy_end_date ? (
                <>
                  Academy:{" "}
                  {formatDate(cohort.academy_start_date)}
                  {cohort.academy_end_date && (
                    <> &ndash; {formatDate(cohort.academy_end_date)}</>
                  )}
                </>
              ) : (
                "Academy dates not set"
              )}
            </p>
          </div>
          <span
            className={`
              text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mt-1
              ${
                cohort.status === "active"
                  ? "bg-green-100 text-green-800"
                  : cohort.status === "closed"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-yellow-100 text-yellow-800"
              }
            `}
            aria-label={`Cohort status: ${cohort.status}`}
          >
            {/* Text label so status is not conveyed by color alone */}
            {cohort.status === "active"
              ? "Active"
              : cohort.status === "closed"
              ? "Closed"
              : cohort.status}
          </span>
        </div>
      </div>

      {/* ── Completion summary ──────────────────────────────────────────── */}
      <section aria-labelledby="completion-heading" className="mb-8">
        <h2
          id="completion-heading"
          className="text-brand-navy text-lg font-bold mb-4"
        >
          Completion Summary
        </h2>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total Participants", value: total },
            {
              label: "Completed",
              value: completedCount,
              accent: "text-green-700",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              accent: "text-brand-blue",
            },
            { label: "Not Started", value: notStartedCount, accent: "text-gray-500" },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {label}
              </div>
              <div
                className={`text-3xl font-bold tabular-nums ${
                  accent ?? "text-brand-navy"
                }`}
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
              {completionRate}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Cohort completion: ${completionRate}% (${completedCount} of ${total} participants)`}
            className="h-3 bg-gray-100 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          {total === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              No participants assigned to this cohort yet.
            </p>
          )}
        </div>
      </section>

      {/* ── KPI averages ────────────────────────────────────────────────── */}
      {kpiAverages ? (
        <section aria-labelledby="kpi-avg-heading" className="mb-8">
          <h2
            id="kpi-avg-heading"
            className="text-brand-navy text-lg font-bold mb-1"
          >
            KPI Averages
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Cohort averages across all {completedCount} completed participant
            {completedCount !== 1 ? "s" : ""}. Final values after Round 3.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.values(KPI_DEFINITIONS).map((kpi) => {
              const avg = kpiAverages![kpi.key] ?? 0;
              return (
                <div
                  key={kpi.key}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {kpi.label}
                    </span>
                    <span className="text-lg font-bold text-brand-navy tabular-nums ml-2">
                      {avg}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={avg}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${kpi.label} cohort average: ${avg} out of 100`}
                    className="h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-brand-blue rounded-full"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : completedCount === 0 ? (
        <section aria-labelledby="kpi-avg-heading" className="mb-8">
          <h2
            id="kpi-avg-heading"
            className="text-brand-navy text-lg font-bold mb-2"
          >
            KPI Averages
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            No completions yet. KPI averages will appear once participants
            finish the simulation.
          </div>
        </section>
      ) : null}

      {/* ── Score averages ───────────────────────────────────────────────── */}
      {scoreAverages ? (
        <section aria-labelledby="score-avg-heading" className="mb-8">
          <h2
            id="score-avg-heading"
            className="text-brand-navy text-lg font-bold mb-1"
          >
            Leadership Score Averages
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Cohort averages across 7 dimensions. Bars show relative strength.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {Object.values(SCORING_DIMENSIONS).map((dim) => {
              const avg = scoreAverages![dim.key] ?? 0;
              const barPct =
                maxScoreAvg > 0
                  ? Math.round((avg / maxScoreAvg) * 100)
                  : 0;
              return (
                <div key={dim.key} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-brand-navy">
                      {dim.label}
                    </span>
                    <span className="text-sm font-bold text-brand-navy tabular-nums ml-2">
                      {avg} pts
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={avg}
                    aria-valuemin={0}
                    aria-valuemax={maxScoreAvg}
                    aria-label={`${dim.label} cohort average: ${avg} points`}
                    className="h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-brand-blue rounded-full"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : completedCount > 0 ? null : (
        <section aria-labelledby="score-avg-heading" className="mb-8">
          <h2
            id="score-avg-heading"
            className="text-brand-navy text-lg font-bold mb-2"
          >
            Leadership Score Averages
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            No completions yet.
          </div>
        </section>
      )}

      {/* ── Profile distribution ─────────────────────────────────────────── */}
      <section aria-labelledby="profile-dist-heading" className="mb-8">
        <h2
          id="profile-dist-heading"
          className="text-brand-navy text-lg font-bold mb-4"
        >
          Leadership Profile Distribution
        </h2>
        {profileDistribution.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Distribution of assigned leadership profiles across completed
                participants
              </caption>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    scope="col"
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Profile
                  </th>
                  <th
                    scope="col"
                    className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24"
                  >
                    Count
                  </th>
                  <th
                    scope="col"
                    className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24"
                  >
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profileDistribution.map(({ key, label, count }) => {
                  const pct =
                    completedCount > 0
                      ? Math.round((count / completedCount) * 100)
                      : 0;
                  return (
                    <tr key={key} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-brand-navy">
                        {label}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                        {count}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            No profiles assigned yet. Profiles appear once participants complete
            the simulation.
          </div>
        )}
      </section>

      {/* ── Navigation links ────────────────────────────────────────────── */}
      <nav
        aria-label="Faculty sub-sections"
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link
          href="/faculty/participants"
          className="
            block bg-white border border-gray-200 rounded-xl p-5
            hover:border-brand-blue hover:shadow-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          "
        >
          <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-1">
            View all
          </div>
          <div className="text-brand-navy font-bold text-lg mb-1">
            Participant List
          </div>
          <p className="text-gray-500 text-sm">
            See every participant&apos;s completion status, assigned profile, and
            individual results.
          </p>
        </Link>

        <Link
          href="/faculty/decisions"
          className="
            block bg-white border border-gray-200 rounded-xl p-5
            hover:border-brand-blue hover:shadow-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          "
        >
          <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-1">
            Aggregate view
          </div>
          <div className="text-brand-navy font-bold text-lg mb-1">
            Decision Patterns
          </div>
          <p className="text-gray-500 text-sm">
            See how the cohort split across each decision option across all
            three rounds.
          </p>
        </Link>
      </nav>
    </main>
  );
}
