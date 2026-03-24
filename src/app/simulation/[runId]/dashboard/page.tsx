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
import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { assignPerformanceProfile } from "@/engine/profiling";
import PreviewBanner from "@/components/simulation/PreviewBanner";
import type {
  KPIValues,
  ScoreValues,
  PerformanceProfileKey,
  PerformanceProfile,
  ProfileRuleLogic,
} from "@/engine/types";

interface Props {
  params: { runId: string };
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

export default async function ParticipantDashboardPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select(
      "id, status, user_id, current_round_number, scenario_version_id, final_profile_id, completed_at, is_preview"
    )
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();
  if (run.status !== "completed") {
    if (run.status === "not_started") redirect(`/simulation/${run.id}/orientation`);
    redirect(`/simulation/${run.id}/round/${run.current_round_number ?? 1}`);
  }

  // ── Load scenario round IDs ──────────────────────────────────────────────

  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .order("round_number");

  const roundIdMap = new Map(
    (scenarioRounds ?? []).map((r) => [r.round_number as number, r.id as string])
  );

  // ── Load all data in parallel ────────────────────────────────────────────

  const makeRoundKpiQuery = (roundNum: number) => {
    const rid = roundIdMap.get(roundNum);
    if (!rid) return Promise.resolve({ data: null });
    return supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", run.id)
      .eq("scenario_round_id", rid)
      .eq("snapshot_type", "round_end")
      .maybeSingle();
  };

  const [
    initialKpiRes,
    r1KpiRes,
    r2KpiRes,
    r3KpiRes,
    finalScoreRes,
    dbProfilesRes,
    dbRulesRes,
    recommendationRes,
  ] = await Promise.all([
    supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", run.id)
      .eq("snapshot_type", "initial")
      .maybeSingle(),
    makeRoundKpiQuery(1),
    makeRoundKpiQuery(2),
    makeRoundKpiQuery(3),
    (() => {
      const rid = roundIdMap.get(3);
      if (!rid) return Promise.resolve({ data: null });
      return supabase
        .from("score_snapshots")
        .select("score_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", rid)
        .eq("snapshot_type", "round_end")
        .maybeSingle();
    })(),
    supabase
      .from("performance_profiles")
      .select("id, key, label, description, strengths_text, blind_spots_text"),
    supabase
      .from("profile_rules")
      .select("performance_profile_id, priority_order, rule_logic_json"),
    supabase
      .from("executive_recommendations")
      .select(
        "prioritized_strategy, action_plan_90_day, key_risks, talent_implications, communication_approach"
      )
      .eq("simulation_run_id", run.id)
      .maybeSingle(),
  ]);

  // ── Build KPI state ──────────────────────────────────────────────────────

  const baselineKPIs = (
    initialKpiRes.data?.kpi_values_json ?? buildInitialKPIs()
  ) as KPIValues;
  const r1KPIs = (r1KpiRes.data?.kpi_values_json ?? baselineKPIs) as KPIValues;
  const r2KPIs = (r2KpiRes.data?.kpi_values_json ?? r1KPIs) as KPIValues;
  const finalKPIs = (r3KpiRes.data?.kpi_values_json ?? r2KPIs) as KPIValues;
  const finalScores = (finalScoreRes.data?.score_values_json ?? {}) as ScoreValues;

  // ── Profile assignment ───────────────────────────────────────────────────

  let assignedProfileKey: PerformanceProfileKey | null = null;

  if (run.final_profile_id) {
    const match = (dbProfilesRes.data ?? []).find(
      (p) => p.id === run.final_profile_id
    );
    assignedProfileKey = (match?.key as PerformanceProfileKey) ?? null;
  } else {
    // final_profile_id not yet set — run assignment and persist
    const dbProfiles = dbProfilesRes.data ?? [];
    const dbRules = dbRulesRes.data ?? [];

    if (dbProfiles.length > 0) {
      const engineProfiles: PerformanceProfile[] = dbProfiles.map((p) => ({
        key: p.key as PerformanceProfileKey,
        label: p.label,
        description: p.description ?? "",
        strengthsText: p.strengths_text ?? "",
        blindSpotsText: p.blind_spots_text ?? "",
        rules: dbRules
          .filter((r) => r.performance_profile_id === p.id)
          .map((r) => ({
            priorityOrder: r.priority_order as number,
            ruleLogicJson: r.rule_logic_json as ProfileRuleLogic,
          })),
      }));

      const result = assignPerformanceProfile(finalKPIs, finalScores, [], engineProfiles);
      assignedProfileKey = result.profileKey;

      const matched = dbProfiles.find((p) => p.key === result.profileKey);
      if (matched) {
        await supabase
          .from("simulation_runs")
          .update({ final_profile_id: matched.id, last_active_at: new Date().toISOString() })
          .eq("id", run.id);
      }
    } else {
      const result = assignPerformanceProfile(finalKPIs, finalScores, [], PERFORMANCE_PROFILES);
      assignedProfileKey = result.profileKey;
    }
  }

  const displayProfile =
    PERFORMANCE_PROFILES.find((p) => p.key === assignedProfileKey) ?? null;

  // ── Derived display data ─────────────────────────────────────────────────

  const kpiList = Object.values(KPI_DEFINITIONS);
  const scoreList = Object.values(SCORING_DIMENSIONS);
  const recommendation = recommendationRes.data ?? null;

  const kpiTrajectory = [
    { label: "Baseline", values: baselineKPIs },
    { label: "Round 1",  values: r1KPIs       },
    { label: "Round 2",  values: r2KPIs       },
    { label: "Round 3",  values: finalKPIs    },
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
                  <h4 className="text-[12px] font-semibold text-white/40 uppercase tracking-[0.06em] mb-2">
                    Strengths
                  </h4>
                  <p className="text-white/80 text-[15px] leading-[1.65]">
                    {displayProfile.strengthsText}
                  </p>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-white/40 uppercase tracking-[0.06em] mb-2">
                    Blind Spots
                  </h4>
                  <p className="text-white/80 text-[15px] leading-[1.65]">
                    {displayProfile.blindSpotsText}
                  </p>
                </div>
              </div>
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
