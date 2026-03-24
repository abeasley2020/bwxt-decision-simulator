/**
 * Performance Dashboard
 * Route: /simulation/[runId]/results
 *
 * Accessible after all 3 rounds are submitted (current_round_number >= 4).
 *
 * Displays:
 *  - Final KPI values with progress bars
 *  - KPI trajectory table: Baseline → R1 → R2 → R3
 *  - Leadership score dimensions with proportional bars
 *  - Assigned leadership profile (label, description, strengths, blind spots)
 *  - Link to Executive Recommendation (or Completion if already done)
 *
 * Profile assignment:
 *  - Loads performance_profiles + profile_rules from the database
 *  - Runs the engine's deterministic assignPerformanceProfile()
 *  - Persists final_profile_id to simulation_runs on first visit
 *
 * WCAG: semantic landmark regions; correct heading hierarchy (h1 → h2 → h3);
 * progress bars use role="progressbar" with aria-valuenow/min/max/label;
 * score/KPI changes conveyed via symbol + text (not color alone);
 * table has caption and proper th/td markup.
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

export default async function ResultsPage({ params }: Props) {
  const supabase = createClient();

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
      "id, status, current_round_number, user_id, scenario_version_id, final_profile_id, is_preview"
    )
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "not_started") {
    redirect(`/simulation/${run.id}/orientation`);
  }
  // Must have finished all 3 rounds (current_round_number advances to 4 after round 3)
  if (run.status === "in_progress" && run.current_round_number < 4) {
    redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
  }

  // ── Load scenario round IDs ─────────────────────────────────────────────────

  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .order("round_number");

  const roundIdMap = new Map(
    (scenarioRounds ?? []).map((r) => [r.round_number as number, r.id as string])
  );

  // ── Load KPI snapshots in parallel ─────────────────────────────────────────

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
  ]);

  // ── Build KPI state ─────────────────────────────────────────────────────────

  const baselineKPIs = (
    initialKpiRes.data?.kpi_values_json ?? buildInitialKPIs()
  ) as KPIValues;
  const r1KPIs = (r1KpiRes.data?.kpi_values_json ?? baselineKPIs) as KPIValues;
  const r2KPIs = (r2KpiRes.data?.kpi_values_json ?? r1KPIs) as KPIValues;
  const finalKPIs = (r3KpiRes.data?.kpi_values_json ?? r2KPIs) as KPIValues;
  const finalScores = (finalScoreRes.data?.score_values_json ?? {}) as ScoreValues;

  // ── Profile assignment ──────────────────────────────────────────────────────

  let assignedProfileKey: PerformanceProfileKey | null = null;

  if (run.final_profile_id) {
    // Already assigned — look up key
    const match = (dbProfilesRes.data ?? []).find(
      (p) => p.id === run.final_profile_id
    );
    assignedProfileKey = (match?.key as PerformanceProfileKey) ?? null;
  } else {
    const dbProfiles = dbProfilesRes.data ?? [];
    const dbRules = dbRulesRes.data ?? [];

    if (dbProfiles.length > 0) {
      // Build PerformanceProfile[] from DB records for the engine
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

      const result = assignPerformanceProfile(
        finalKPIs,
        finalScores,
        [],
        engineProfiles
      );
      assignedProfileKey = result.profileKey;

      const matched = dbProfiles.find((p) => p.key === result.profileKey);
      if (matched) {
        await supabase
          .from("simulation_runs")
          .update({
            final_profile_id: matched.id,
            last_active_at: new Date().toISOString(),
          })
          .eq("id", run.id);
      }
    } else {
      // Fallback: use TypeScript profiles if DB not seeded
      const result = assignPerformanceProfile(
        finalKPIs,
        finalScores,
        [],
        PERFORMANCE_PROFILES
      );
      assignedProfileKey = result.profileKey;
    }
  }

  // Use TypeScript profiles for display text (authoritative source for UI copy)
  const displayProfile =
    PERFORMANCE_PROFILES.find((p) => p.key === assignedProfileKey) ?? null;

  // ── Derived display data ────────────────────────────────────────────────────

  const kpiList = Object.values(KPI_DEFINITIONS);
  const scoreList = Object.values(SCORING_DIMENSIONS);

  const scoreValues = Object.values(finalScores) as number[];
  const maxScore = Math.max(...scoreValues, 1);

  const kpiTrajectory = [
    { label: "Baseline", values: baselineKPIs },
    { label: "Round 1", values: r1KPIs },
    { label: "Round 2", values: r2KPIs },
    { label: "Round 3", values: finalKPIs },
  ];

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

      <main className="max-w-[880px] mx-auto px-6 py-8 space-y-8">

        {/* ── Leadership Profile ──────────────────────────────────────────── */}
        {displayProfile && (
          <section aria-labelledby="profile-heading">
            <h2
              id="profile-heading"
              className="text-[18px] font-semibold text-bwxt-navy mb-3"
            >
              Your Leadership Profile
            </h2>
            <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-bwxt-navy flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-white font-bold text-[18px]">
                    {displayProfile.label[0]}
                  </span>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-bwxt-crimson uppercase tracking-[0.06em] mb-0.5">
                    Assigned Profile
                  </div>
                  <h3 className="font-playfair font-bold text-[22px] text-bwxt-navy">
                    {displayProfile.label}
                  </h3>
                  <p className="text-[15px] text-bwxt-text-secondary mt-1 leading-[1.65]">
                    {displayProfile.description}
                  </p>
                </div>
              </div>
              <div className="border-t border-bwxt-border mt-5 pt-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-[12px] font-semibold text-bwxt-navy uppercase tracking-[0.05em] mb-2">
                    Strengths
                  </h4>
                  <p className="text-[15px] text-bwxt-text-secondary leading-[1.65]">
                    {displayProfile.strengthsText}
                  </p>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-bwxt-navy uppercase tracking-[0.05em] mb-2">
                    Blind Spots
                  </h4>
                  <p className="text-[15px] text-bwxt-text-secondary leading-[1.65]">
                    {displayProfile.blindSpotsText}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Final KPI Values ────────────────────────────────────────────── */}
        <section aria-labelledby="kpi-values-heading">
          <h2
            id="kpi-values-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            Final KPI Values
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            Your division&apos;s indicators at simulation close. Net change shown
            versus your starting baseline.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpiList.map((kpi) => {
              const final = finalKPIs[kpi.key] ?? kpi.defaultStartValue;
              const baseline = baselineKPIs[kpi.key] ?? kpi.defaultStartValue;
              const delta = final - baseline;
              const isPos = delta > 0;
              const isNeg = delta < 0;
              const deltaText = isPos
                ? `Increased by ${delta} from baseline`
                : isNeg
                ? `Decreased by ${Math.abs(delta)} from baseline`
                : "No change from baseline";
              return (
                <div
                  key={kpi.key}
                  className="bg-white border border-bwxt-border rounded-xl shadow-card p-4"
                >
                  <div className="text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.05em] mb-2">
                    {kpi.label}
                  </div>
                  <div className="text-[28px] font-semibold text-bwxt-navy leading-none tabular-nums mb-2">
                    {final}
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={final}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${kpi.label}: ${final} out of 100`}
                    className="h-[4px] bg-bwxt-border rounded-full overflow-hidden mb-2"
                  >
                    <div
                      className="h-full bg-bwxt-navy rounded-full"
                      style={{ width: `${final}%` }}
                    />
                  </div>
                  {/* Net delta — symbol + text + color (WCAG 1.4.1) */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-semibold border ${
                      isPos
                        ? "text-bwxt-success bg-green-50 border-green-200"
                        : isNeg
                        ? "text-bwxt-danger bg-bwxt-crimson-light border-bwxt-crimson/20"
                        : "text-bwxt-text-muted bg-bwxt-border/40 border-bwxt-border"
                    }`}
                    aria-label={deltaText}
                  >
                    <span aria-hidden="true">
                      {isPos ? "▲" : isNeg ? "▼" : "="}
                    </span>
                    <span>
                      {isPos ? `+${delta}` : isNeg ? `${delta}` : "0"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── KPI Trajectory ──────────────────────────────────────────────── */}
        <section aria-labelledby="trajectory-heading">
          <h2
            id="trajectory-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            KPI Trajectory
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            How each indicator moved across all three rounds. Arrows show
            change from the previous checkpoint.
          </p>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <caption className="sr-only">
                KPI values at each checkpoint: Baseline, Round 1, Round 2, and
                Round 3 (Final)
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
                </tr>
              </thead>
              <tbody className="divide-y divide-bwxt-border">
                {kpiList.map((kpi) => (
                  <tr key={kpi.key} className="hover:bg-bwxt-navy-light/40">
                    <td className="px-4 py-3 text-[14px] font-medium text-bwxt-navy leading-snug">
                      {kpi.label}
                    </td>
                    {kpiTrajectory.map((t, idx) => {
                      const val = t.values[kpi.key] ?? kpi.defaultStartValue;
                      const prev =
                        idx > 0
                          ? (kpiTrajectory[idx - 1].values[kpi.key] ??
                            kpi.defaultStartValue)
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
                              className={`ml-1 text-[12px] ${
                                d > 0 ? "text-bwxt-success" : "text-bwxt-danger"
                              }`}
                              aria-label={
                                d > 0
                                  ? `increased by ${d}`
                                  : `decreased by ${Math.abs(d)}`
                              }
                            >
                              {d > 0 ? `▲${d}` : `▼${Math.abs(d)}`}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Score Dimensions ────────────────────────────────────────────── */}
        <section aria-labelledby="scores-heading">
          <h2
            id="scores-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            Leadership Score Dimensions
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            Points accumulated across all three rounds. Bars show relative
            strength across your seven leadership dimensions.
          </p>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card divide-y divide-bwxt-border">
            {scoreList.map((dim) => {
              const score = (finalScores[dim.key] ?? 0) as number;
              const barPct =
                maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
              return (
                <div key={dim.key} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-bwxt-navy">
                      {dim.label}
                    </span>
                    <span className="text-[15px] font-bold text-bwxt-navy tabular-nums">
                      {score} pts
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={maxScore}
                    aria-label={`${dim.label}: ${score} points`}
                    className="h-[4px] bg-bwxt-border rounded-full overflow-hidden my-2"
                  >
                    <div
                      className="h-full bg-bwxt-crimson rounded-full"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <p className="text-[13px] text-bwxt-text-muted leading-snug">
                    {dim.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Continue ────────────────────────────────────────────────────── */}
        <div className="border-t border-bwxt-border pt-8">
          {run.status === "completed" ? (
            <Link
              href={`/simulation/${run.id}/complete`}
              className="
                block w-full max-w-[440px] mx-auto py-[14px] text-center
                bg-bwxt-navy text-white font-semibold text-[15px] rounded-[14px]
                hover:bg-bwxt-navy-dark transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
              "
            >
              View Completion Summary
            </Link>
          ) : (
            <>
              <Link
                href={`/simulation/${run.id}/recommendation`}
                className="
                  block w-full max-w-[440px] mx-auto py-[14px] text-center
                  bg-bwxt-navy text-white font-semibold text-[15px] rounded-[14px]
                  hover:bg-bwxt-navy-dark transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
                "
              >
                Continue to Executive Recommendation
              </Link>
              <p className="mt-3 text-center text-[13px] text-bwxt-text-muted">
                Complete your executive recommendation to finish the simulation.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
