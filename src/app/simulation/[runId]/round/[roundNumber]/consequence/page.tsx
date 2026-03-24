/**
 * Consequence / transition page — shown after a round is submitted.
 *
 * Displays:
 *  - Pre-authored consequence narrative for the completed round
 *  - Stakeholder reactions
 *  - KPI delta from baseline to post-round values
 *  - Continue button (to next round or placeholder)
 *
 * Scenario content and KPI data are loaded server-side.
 * No UI content is hardcoded in this file.
 *
 * WCAG: semantic landmark regions; correct heading hierarchy;
 * KPI changes conveyed via symbol + text + color (not color alone);
 * screen-reader-friendly delta announcements via aria-label.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_CONSEQUENCES } from "@/content/iron-horizon/consequences";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import { KPI_DEFINITIONS, buildInitialKPIs, computeKPIDelta } from "@/engine/kpi";
import KPIChangeCard from "@/components/kpi/KPIChangeCard";
import SimulationNav from "@/components/SimulationNav";
import PreviewBanner from "@/components/simulation/PreviewBanner";
import type { KPIValues, KPIKey } from "@/engine/types";

interface Props {
  params: { runId: string; roundNumber: string };
}

export default async function ConsequencePage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) notFound();

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, scenario_version_id, is_preview")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "completed") redirect(`/simulation/${run.id}/complete`);
  if (run.status === "not_started") {
    redirect(`/simulation/${run.id}/orientation`);
  }

  // Only accessible if this round has been submitted
  if (run.current_round_number <= roundNumber) {
    redirect(`/simulation/${run.id}/round/${roundNumber}`);
  }

  // Load consequence content for this round
  const consequence = IRON_HORIZON_CONSEQUENCES[roundNumber];

  // ── KPI snapshot loading ───────────────────────────────────────────────────
  // For Round 1: baseline = initial snapshot.
  // For Round N > 1: baseline = the previous round's round_end snapshot so
  // deltas reflect what changed *in this round*, not since the simulation began.

  let baselineSnap: { kpi_values_json: unknown } | null = null;

  if (roundNumber === 1) {
    const { data } = await supabase
      .from("kpi_snapshots")
      .select("kpi_values_json")
      .eq("simulation_run_id", run.id)
      .eq("snapshot_type", "initial")
      .maybeSingle();
    baselineSnap = data;
  } else {
    // Look up the previous scenario_round's id to pinpoint its round_end snapshot
    const { data: prevRound } = await supabase
      .from("scenario_rounds")
      .select("id")
      .eq("scenario_version_id", run.scenario_version_id)
      .eq("round_number", roundNumber - 1)
      .maybeSingle();

    if (prevRound) {
      const { data } = await supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", prevRound.id)
        .eq("snapshot_type", "round_end")
        .maybeSingle();
      baselineSnap = data;
    }
  }

  // Current round's end snapshot
  const { data: currentRoundSnap } = await supabase
    .from("scenario_rounds")
    .select("id")
    .eq("scenario_version_id", run.scenario_version_id)
    .eq("round_number", roundNumber)
    .maybeSingle();

  const roundEndQuery = currentRoundSnap
    ? supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", currentRoundSnap.id)
        .eq("snapshot_type", "round_end")
        .maybeSingle()
    : supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("snapshot_type", "round_end")
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const { data: roundEndData } = await roundEndQuery;

  const baselineKPIs = (
    baselineSnap?.kpi_values_json ?? buildInitialKPIs()
  ) as KPIValues;

  const updatedKPIs = roundEndData?.kpi_values_json as KPIValues | null;

  const deltas = updatedKPIs
    ? computeKPIDelta(baselineKPIs, updatedKPIs)
    : {};

  const kpiList = Object.values(KPI_DEFINITIONS);
  const hasKPIData = updatedKPIs !== null;

  // Determine the next destination
  const nextRound = roundNumber + 1;
  const nextRoundExists = IRON_HORIZON_VERSION.rounds.some(
    (r) => r.roundNumber === nextRound
  );
  const nextHref = nextRoundExists
    ? `/simulation/${run.id}/round/${nextRound}`
    : `/simulation/${run.id}/results`;
  const nextLabel = nextRoundExists
    ? `Continue to Round ${nextRound}`
    : "View Final Results";

  return (
    <div className="min-h-screen bg-bwxt-bg">
      <SimulationNav roundLabel={`Round ${roundNumber} of 3`} />
      {run.is_preview && <PreviewBanner />}

      {/* Status bar */}
      <div className="bg-bwxt-navy-light border-b border-bwxt-border">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center gap-3">
          <span className="bg-bwxt-crimson text-white text-[12px] font-semibold px-3 py-1 rounded-full">
            Round {roundNumber} Complete
          </span>
          <span className="text-bwxt-text-secondary text-[13px]">
            &mdash; {consequence?.headline ?? "Results"}
          </span>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-8 space-y-8">
        {consequence ? (
          <>
            {/* ── What Happened ──────────────────────────────────────── */}
            <section aria-labelledby="consequence-heading">
              <h2
                id="consequence-heading"
                className="text-[18px] font-semibold text-bwxt-navy mb-3"
              >
                What Happened
              </h2>
              <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
                {consequence.narrative
                  .split("\n")
                  .filter(Boolean)
                  .map((para, i) => (
                    <p
                      key={i}
                      className="text-[15px] text-bwxt-text-primary leading-[1.65] mb-3 last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
              </div>
            </section>

            {/* ── Stakeholder Reactions ──────────────────────────────── */}
            <section aria-labelledby="reactions-heading">
              <h2
                id="reactions-heading"
                className="text-[18px] font-semibold text-bwxt-navy mb-3"
              >
                Stakeholder Reactions
              </h2>
              <div className="space-y-3">
                {consequence.stakeholderReactions.map((reaction) => (
                  <div
                    key={reaction.name}
                    className="bg-white border border-bwxt-border rounded-xl shadow-card p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full bg-bwxt-navy-light flex items-center justify-center text-bwxt-navy font-semibold text-[13px] flex-shrink-0"
                        aria-hidden="true"
                      >
                        {reaction.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-[14px] text-bwxt-navy">
                            {reaction.name}
                          </span>
                          <span className="text-[13px] text-bwxt-text-muted">
                            {reaction.role}
                          </span>
                        </div>
                        <p className="text-[15px] text-bwxt-text-primary leading-relaxed italic mt-1">
                          &ldquo;{reaction.reaction}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
              <p className="text-[15px] text-bwxt-text-secondary">
                Round {roundNumber} has been submitted. Review your KPI changes
                below.
              </p>
            </div>
          </section>
        )}

        {/* ── KPI Changes ─────────────────────────────────────────────── */}
        <section aria-labelledby="kpi-heading">
          <h2
            id="kpi-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            KPI Changes
          </h2>
          {hasKPIData ? (
            <>
              <p className="text-[15px] text-bwxt-text-secondary mb-4">
                How your decisions moved the division&apos;s key performance
                indicators. Arrows and numbers indicate direction and magnitude
                of change.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {kpiList.map((kpi) => {
                  const before = baselineKPIs[kpi.key];
                  const after = updatedKPIs
                    ? (updatedKPIs[kpi.key as KPIKey] ?? before)
                    : before;
                  return (
                    <KPIChangeCard
                      key={kpi.key}
                      label={kpi.label}
                      before={before}
                      after={after}
                    />
                  );
                })}
              </div>

              {/* Summary of changed KPIs for screen readers */}
              <div className="sr-only" aria-live="polite">
                <h3>KPI change summary</h3>
                <ul>
                  {kpiList
                    .filter((kpi) => (deltas[kpi.key] ?? 0) !== 0)
                    .map((kpi) => {
                      const delta = deltas[kpi.key] ?? 0;
                      return (
                        <li key={kpi.key}>
                          {kpi.label}:{" "}
                          {delta > 0
                            ? `increased by ${delta}`
                            : `decreased by ${Math.abs(delta)}`}
                        </li>
                      );
                    })}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
              <p className="text-[15px] text-bwxt-text-muted">
                KPI snapshot data is not available. This can happen if the
                database seed has not been applied. Contact your administrator.
              </p>
            </div>
          )}
        </section>

        {/* ── Continue ─────────────────────────────────────────────────── */}
        <div className="border-t border-bwxt-border pt-8">
          <Link
            href={nextHref}
            className="
              block w-full max-w-[440px] mx-auto py-[14px] text-center
              bg-bwxt-navy text-white font-semibold text-[15px] rounded-[14px]
              hover:bg-bwxt-navy-dark transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
            "
          >
            {nextLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
