/**
 * Participant Performance Dashboard — /simulation/[runId]/dashboard
 *
 * Shown after simulation completion. Displays:
 *  - Assigned leadership profile (label, description, strengths, blind spots)
 *  - KPI trajectory table: Baseline → R1 → R2 → R3 with net delta column
 *  - Leadership score dimension bars (0–100 absolute scale, 8px track)
 *  - Executive recommendation (all 5 fields, or link to complete if absent)
 *
 * Profile assignment runs here if final_profile_id is not yet set
 * (e.g. user completed then came here directly, bypassing /results).
 *
 * WCAG: semantic landmark regions; h1 → h2 → h3 hierarchy; progress bars
 * with role="progressbar" and aria-labels; delta changes conveyed by
 * symbol + text + colour (not colour alone); table has caption + th scope.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KPI_DEFINITIONS } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { loadRunSnapshots } from "@/lib/simulation/loadRunSnapshots";
import { resolveRunProfile } from "@/lib/simulation/resolveRunProfile";
import PreviewBanner from "@/components/simulation/PreviewBanner";

interface Props {
  params: Promise<{ runId: string }>;
}

// ── Label map for executive recommendation fields ──────────────────────────

const REC_FIELDS: Array<{ key: string; label: string }> = [
  { key: "prioritized_strategy",    label: "Prioritized Strategy"       },
  { key: "action_plan_90_day",      label: "90-Day Action Plan"         },
  { key: "key_risks",               label: "Key Risks"                  },
  { key: "talent_implications",     label: "Talent Implications"        },
  { key: "communication_approach",  label: "Communication Approach"     },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function ParticipantDashboardPage(props: Props) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: publicUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();
  const userId = publicUser?.id ?? user.id;

  const { data: run } = await supabase
    .from("simulation_runs")
    .select(
      "id, status, user_id, current_round_number, scenario_version_id, final_profile_id, completed_at, is_preview"
    )
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!run) notFound();
  if (run.status !== "completed") {
    if (run.status === "not_started") redirect(`/simulation/${run.id}/orientation`);
    redirect(`/simulation/${run.id}/round/${run.current_round_number ?? 1}`);
  }

  // ── Load snapshots and recommendation ────────────────────────────────────
  // Snapshot loading lives in one shared helper so /results, /dashboard,
  // /complete and the printed report cannot disagree about the final numbers.

  const [snapshots, recommendationRes] = await Promise.all([
    loadRunSnapshots(supabase, run.id, run.scenario_version_id),
    supabase
      .from("executive_recommendations")
      .select(
        "prioritized_strategy, action_plan_90_day, key_risks, talent_implications, communication_approach"
      )
      .eq("simulation_run_id", run.id)
      .maybeSingle(),
  ]);

  if (!snapshots.ok) {
    return (
      <div className="min-h-screen bg-bwxt-bg">
        {run.is_preview && <PreviewBanner />}
        <main className="max-w-[880px] mx-auto px-6 py-8 space-y-8">
          <h1 className="font-playfair font-bold text-[28px] text-bwxt-navy">
            Your Performance Dashboard
          </h1>
          <div
            role="alert"
            className="bg-white border-2 border-bwxt-crimson rounded-xl shadow-card p-6"
          >
            <h2 className="text-[18px] font-semibold text-bwxt-navy mb-2">
              Final results unavailable
            </h2>
            <p className="text-[15px] text-bwxt-text-secondary leading-relaxed">
              Your final performance data could not be loaded, so no KPI
              outcomes, scores, or leadership profile are shown. Your decisions
              are saved. Please contact your program administrator so this can
              be resolved.
            </p>
          </div>
          <div className="border-t border-bwxt-border pt-6 text-center">
            <Link
              href={`/simulation/${run.id}/complete`}
              className="text-[14px] text-bwxt-text-secondary hover:text-bwxt-navy underline underline-offset-2 transition-colors"
            >
              View Completion Summary
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const baselineKPIs = snapshots.baseline;
  const finalKPIs = snapshots.final;
  const finalScores = snapshots.finalScores;
  const finalScoresAvailable = snapshots.finalScoresAvailable;

  // ── Profile assignment ───────────────────────────────────────────────────
  // Shared assign-or-read helper; it refuses to assign from scores that were
  // never actually loaded.

  const assignedProfileKey = await resolveRunProfile(supabase, run, {
    finalKPIs,
    finalScores,
    finalScoresAvailable,
  });

  const displayProfile =
    PERFORMANCE_PROFILES.find((p) => p.key === assignedProfileKey) ?? null;

  // ── Derived display data ─────────────────────────────────────────────────

  const kpiList = Object.values(KPI_DEFINITIONS);
  const scoreList = Object.values(SCORING_DIMENSIONS);
  const recommendation = recommendationRes.data ?? null;

  const kpiTrajectory = [
    { label: "Baseline", values: baselineKPIs },
    ...(snapshots.r1 ? [{ label: "Round 1", values: snapshots.r1 }] : []),
    ...(snapshots.r2 ? [{ label: "Round 2", values: snapshots.r2 }] : []),
    { label: "Round 3", values: finalKPIs },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bwxt-bg">
      {run.is_preview && <PreviewBanner />}

      {/* Status bar */}
      <div className="bg-bwxt-navy-light border-b border-bwxt-border">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center gap-3">
          <span className="bg-bwxt-crimson text-white text-[12px] font-semibold px-3 py-1 rounded-full">
            All Rounds Complete
          </span>
          <span className="text-bwxt-text-secondary text-[13px]">
            &mdash; Performance Dashboard
          </span>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-8 space-y-10">
        <div>
          <h1 className="font-playfair font-bold text-[28px] text-bwxt-navy mb-1">
            Your Performance Dashboard
          </h1>
          <p className="text-[15px] text-bwxt-text-secondary">
            Review your KPI outcomes, leadership scores, assigned profile, and
            executive recommendation below.
          </p>
        </div>

        {/* ── 1. Leadership Profile ──────────────────────────────────────── */}
        <section aria-labelledby="profile-heading">
          <h2
            id="profile-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            Your Leadership Profile
          </h2>

          {displayProfile ? (
            <div className="bg-bwxt-navy rounded-xl p-6 text-white">
              <div className="text-[12px] font-semibold text-bwxt-crimson uppercase tracking-[0.07em] mb-1">
                Assigned Profile
              </div>
              <h3 className="font-playfair font-bold text-[26px] mb-3 leading-tight">
                {displayProfile.label}
              </h3>
              <p className="text-white/70 text-[15px] leading-[1.65] mb-5">
                {displayProfile.description}
              </p>
              <div className="grid sm:grid-cols-2 gap-5 border-t border-white/10 pt-5">
                <div>
                  <h4 className="text-[12px] font-semibold text-white/60 uppercase tracking-[0.06em] mb-2">
                    Strengths
                  </h4>
                  <p className="text-white/80 text-[15px] leading-[1.65]">
                    {displayProfile.strengthsText}
                  </p>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-white/60 uppercase tracking-[0.06em] mb-2">
                    Blind Spots
                  </h4>
                  <p className="text-white/80 text-[15px] leading-[1.65]">
                    {displayProfile.blindSpotsText}
                  </p>
                </div>
              </div>
            </div>
          ) : !finalScoresAvailable ? (
            <div
              role="alert"
              className="bg-white border-2 border-bwxt-crimson rounded-xl p-6 text-[15px] text-bwxt-text-secondary leading-relaxed"
            >
              Your final scoring data could not be loaded, so no leadership
              profile has been assigned. Your decisions are saved. Please
              contact your program administrator so this can be resolved.
            </div>
          ) : (
            <div className="bg-white border border-bwxt-border rounded-xl p-6 text-center text-bwxt-text-muted text-[14px]">
              Profile assignment is pending. Visit the{" "}
              <Link
                href={`/simulation/${run.id}/results`}
                className="text-bwxt-navy underline underline-offset-2"
              >
                Performance Results
              </Link>{" "}
              page to trigger assignment.
            </div>
          )}
        </section>

        {/* ── 2. KPI Trajectory ─────────────────────────────────────────── */}
        <section aria-labelledby="trajectory-heading">
          <h2
            id="trajectory-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            KPI Trajectory
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            How each indicator moved across all three rounds. The final column
            shows the net change from your starting baseline.
          </p>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <caption className="sr-only">
                KPI values at each checkpoint: Baseline, Round 1, Round 2,
                Round 3, and net delta from baseline to final
              </caption>
              <thead>
                <tr className="bg-bwxt-navy-light border-b border-bwxt-border">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.04em]"
                  >
                    KPI
                  </th>
                  {kpiTrajectory.map((t) => (
                    <th
                      key={t.label}
                      scope="col"
                      className="text-center px-3 py-3 text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.04em] whitespace-nowrap"
                    >
                      {t.label}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="text-center px-3 py-3 text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.04em] whitespace-nowrap"
                  >
                    Net Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bwxt-border">
                {kpiList.map((kpi) => {
                  const baseline = baselineKPIs[kpi.key] ?? kpi.defaultStartValue;
                  const final   = finalKPIs[kpi.key]    ?? kpi.defaultStartValue;
                  const net = final - baseline;
                  const isPos = net > 0;
                  const isNeg = net < 0;
                  return (
                    <tr key={kpi.key} className="hover:bg-bwxt-navy-light/40">
                      <td className="px-4 py-3 text-[14px] font-medium text-bwxt-navy leading-snug">
                        {kpi.label}
                      </td>
                      {kpiTrajectory.map((t, idx) => {
                        const val  = t.values[kpi.key] ?? kpi.defaultStartValue;
                        const prev = idx > 0
                          ? (kpiTrajectory[idx - 1].values[kpi.key] ?? kpi.defaultStartValue)
                          : val;
                        const d = val - prev;
                        return (
                          <td
                            key={t.label}
                            className="text-center px-3 py-3 tabular-nums font-semibold text-bwxt-navy"
                          >
                            {val}
                            {idx > 0 && d !== 0 && (
                              <span
                                className={`ml-1 text-[11px] ${d > 0 ? "text-bwxt-success" : "text-bwxt-danger"}`}
                                aria-label={d > 0 ? `increased by ${d}` : `decreased by ${Math.abs(d)}`}
                              >
                                {d > 0 ? `▲${d}` : `▼${Math.abs(d)}`}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3">
                        <span
                          className={`
                            inline-flex items-center gap-0.5 px-2 py-0.5 rounded
                            text-[12px] font-semibold border tabular-nums
                            ${isPos ? "text-bwxt-success bg-green-50 border-green-200"
                            : isNeg ? "text-bwxt-danger bg-bwxt-crimson-light border-bwxt-crimson/20"
                            :         "text-bwxt-text-muted bg-bwxt-border/40 border-bwxt-border"}
                          `}
                          aria-label={
                            isPos ? `net increase of ${net}`
                            : isNeg ? `net decrease of ${Math.abs(net)}`
                            : "no net change"
                          }
                        >
                          <span aria-hidden="true">
                            {isPos ? "▲" : isNeg ? "▼" : "="}
                          </span>
                          {isPos ? `+${net}` : isNeg ? `${net}` : "0"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 3. Leadership Score Breakdown ─────────────────────────────── */}
        <section aria-labelledby="scores-heading">
          <h2
            id="scores-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            Leadership Score Breakdown
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            Points accumulated across all three rounds across your seven
            leadership dimensions.
          </p>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card divide-y divide-bwxt-border">
            {scoreList.map((dim) => {
              const score = Math.round((finalScores[dim.key] ?? 0) as number);
              const barPct = Math.min(Math.max(score, 0), 100);
              return (
                <div key={dim.key} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-semibold text-bwxt-navy">
                      {dim.label}
                    </span>
                    <span className="text-[14px] font-bold text-bwxt-navy tabular-nums">
                      {score}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${dim.label}: ${score} out of 100`}
                    style={{
                      height: "8px",
                      backgroundColor: "#E0DFF0",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barPct}%`,
                        backgroundColor: "#17153A",
                        borderRadius: "9999px",
                      }}
                    />
                  </div>
                  {dim.description && (
                    <p className="text-[13px] text-bwxt-text-muted mt-1.5 leading-snug">
                      {dim.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 4. Executive Recommendation ───────────────────────────────── */}
        <section aria-labelledby="rec-heading">
          <h2
            id="rec-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            Executive Recommendation
          </h2>

          {recommendation ? (
            <div className="bg-white border border-bwxt-border rounded-xl shadow-card divide-y divide-bwxt-border">
              {REC_FIELDS.map(({ key, label }) => {
                const value = (recommendation as Record<string, string | null>)[key];
                if (!value) return null;
                return (
                  <div key={key} className="px-6 py-5">
                    <h3 className="text-[12px] font-semibold text-bwxt-crimson uppercase tracking-[0.06em] mb-2">
                      {label}
                    </h3>
                    <p className="text-[15px] text-bwxt-text-primary leading-[1.7] whitespace-pre-wrap">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-8 text-center">
              <p className="text-[15px] text-bwxt-text-secondary mb-4">
                Your executive recommendation has not been submitted yet.
              </p>
              <Link
                href={`/simulation/${run.id}/recommendation`}
                className="
                  inline-block px-6 py-3 bg-bwxt-navy text-white
                  font-semibold text-[14px] rounded-[10px]
                  hover:bg-bwxt-navy-dark transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
                "
              >
                Complete your Executive Recommendation →
              </Link>
            </div>
          )}
        </section>

        {/* ── Footer link back to completion summary ─────────────────────── */}
        <div className="border-t border-bwxt-border pt-6 text-center">
          <Link
            href={`/simulation/${run.id}/complete`}
            className="text-[14px] text-bwxt-text-secondary hover:text-bwxt-navy underline underline-offset-2 transition-colors"
          >
            View Completion Summary
          </Link>
        </div>
      </main>
    </div>
  );
}
