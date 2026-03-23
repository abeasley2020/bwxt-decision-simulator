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
    .select("id, status, current_round_number, user_id, scenario_version_id")
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
    <div className="min-h-screen bg-brand-light">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-brand-navy text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div
              className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-0.5"
              aria-hidden="true"
            >
              Round {roundNumber} Complete
            </div>
            <h1 className="text-white font-bold text-lg leading-tight">
              {consequence?.headline ?? `Round ${roundNumber} Results`}
            </h1>
          </div>
          <div
            className="text-white/40 text-xs text-right hidden sm:block"
            aria-hidden="true"
          >
            <div>Operation Iron Horizon</div>
            <div className="mt-0.5 flex gap-1">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1 w-8 rounded-full ${
                    n <= roundNumber ? "bg-brand-gold" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {consequence ? (
          <>
            {/* ── Consequence narrative ──────────────────────────────── */}
            <section aria-labelledby="consequence-heading" className="mb-8">
              <h2
                id="consequence-heading"
                className="text-brand-navy text-lg font-bold mb-3"
              >
                What Happened
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                {consequence.narrative
                  .split("\n")
                  .filter(Boolean)
                  .map((para, i) => (
                    <p
                      key={i}
                      className="text-gray-700 text-sm leading-relaxed mb-3 last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
              </div>
            </section>

            {/* ── Stakeholder reactions ──────────────────────────────── */}
            <section aria-labelledby="reactions-heading" className="mb-8">
              <h2
                id="reactions-heading"
                className="text-brand-navy text-lg font-bold mb-3"
              >
                Stakeholder Reactions
              </h2>
              <div className="space-y-3">
                {consequence.stakeholderReactions.map((reaction) => (
                  <div
                    key={reaction.name}
                    className="bg-white border border-gray-200 rounded-xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-bold text-sm"
                        aria-hidden="true"
                      >
                        {reaction.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-1">
                          <span className="font-semibold text-sm text-brand-navy">
                            {reaction.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {reaction.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed italic">
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
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-500 text-sm">
                Round {roundNumber} has been submitted. Review your KPI changes
                below.
              </p>
            </div>
          </section>
        )}

        {/* ── KPI changes ───────────────────────────────────────────────── */}
        <section aria-labelledby="kpi-heading" className="mb-10">
          <h2
            id="kpi-heading"
            className="text-brand-navy text-lg font-bold mb-1"
          >
            KPI Changes
          </h2>
          {hasKPIData ? (
            <>
              <p className="text-gray-500 text-sm mb-4">
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <p className="text-gray-400 text-sm">
                KPI snapshot data is not available. This can happen if the
                database seed has not been applied. Contact your administrator.
              </p>
            </div>
          )}
        </section>

        {/* ── Continue ─────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 pt-8">
          <Link
            href={nextHref}
            className="
              block w-full py-4 text-center bg-brand-navy text-white font-bold
              text-base rounded-lg hover:bg-brand-navy/90 transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
            "
          >
            {nextLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
