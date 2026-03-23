/**
 * Completion Page
 * Route: /simulation/[runId]/complete
 *
 * Shown when the simulation is fully complete (status = "completed").
 * Displays:
 *  - Completion confirmation message
 *  - Assigned leadership profile summary
 *  - Condensed final KPI snapshot
 *  - Thank-you message for faculty review
 *  - "Download My Report" placeholder button
 *
 * WCAG: semantic landmark regions; correct heading hierarchy;
 * progress bars have role="progressbar" with aria-labels;
 * all visual cues paired with text equivalents.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import type { KPIValues, PerformanceProfileKey } from "@/engine/types";

interface Props {
  params: { runId: string };
}

export default async function CompletePage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select(
      "id, status, user_id, scenario_version_id, final_profile_id, completed_at"
    )
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();

  // Only accessible when simulation is complete
  if (run.status !== "completed") {
    if (run.status === "not_started") {
      redirect(`/simulation/${run.id}/orientation`);
    }
    redirect(`/simulation/${run.id}/results`);
  }

  // ── Load final KPI snapshot ─────────────────────────────────────────────────

  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .eq("round_number", 3)
    .maybeSingle();

  const { data: finalKpiSnap } = scenarioRounds
    ? await supabase
        .from("kpi_snapshots")
        .select("kpi_values_json")
        .eq("simulation_run_id", run.id)
        .eq("scenario_round_id", scenarioRounds.id)
        .eq("snapshot_type", "round_end")
        .maybeSingle()
    : { data: null };

  const finalKPIs = (finalKpiSnap?.kpi_values_json ?? buildInitialKPIs()) as KPIValues;
  const kpiList = Object.values(KPI_DEFINITIONS);

  // ── Assigned profile ────────────────────────────────────────────────────────

  let profileKey: PerformanceProfileKey | null = null;

  if (run.final_profile_id) {
    const { data: dbProfile } = await supabase
      .from("performance_profiles")
      .select("key")
      .eq("id", run.final_profile_id)
      .maybeSingle();
    profileKey = (dbProfile?.key as PerformanceProfileKey) ?? null;
  }

  const displayProfile =
    PERFORMANCE_PROFILES.find((p) => p.key === profileKey) ?? null;

  // ── Completion date display ─────────────────────────────────────────────────

  const completedDate = run.completed_at
    ? new Date(run.completed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-brand-light">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-brand-navy text-white">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div
            className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-1"
            aria-hidden="true"
          >
            Simulation Complete
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            You&apos;re Done
          </h1>
          <p className="text-white/50 text-sm mt-0.5">
            Operation Iron Horizon &mdash; BWXT Leadership Academy
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Confirmation ────────────────────────────────────────────── */}
        <section aria-labelledby="confirm-heading" className="mb-8">
          <h2 id="confirm-heading" className="sr-only">
            Completion Confirmation
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div
              className="w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center mx-auto mb-4"
              aria-hidden="true"
            >
              <span className="text-brand-gold text-2xl font-bold">✓</span>
            </div>
            <h2 className="text-brand-navy text-xl font-bold mb-2">
              Simulation Successfully Completed
            </h2>
            {completedDate && (
              <p className="text-gray-400 text-xs mb-4">
                Completed on {completedDate}
              </p>
            )}
            <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
              Your decisions across all three rounds and your executive
              recommendation have been recorded. Your outputs will be
              reviewed by faculty as part of the BWXT Leadership Academy
              assessment process.
            </p>
          </div>
        </section>

        {/* ── Assigned Profile ────────────────────────────────────────── */}
        {displayProfile && (
          <section aria-labelledby="profile-heading" className="mb-8">
            <h2
              id="profile-heading"
              className="text-brand-navy text-lg font-bold mb-3"
            >
              Your Leadership Profile
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-navy flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-brand-gold font-bold">
                    {displayProfile.label[0]}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-brand-gold font-semibold uppercase tracking-widest mb-0.5">
                    Assigned Profile
                  </div>
                  <h3 className="text-brand-navy text-lg font-bold">
                    {displayProfile.label}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                    {displayProfile.description}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h4 className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-2">
                    Strengths
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {displayProfile.strengthsText}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-2">
                    Blind Spots
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {displayProfile.blindSpotsText}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Final KPI Snapshot ──────────────────────────────────────── */}
        <section aria-labelledby="kpi-heading" className="mb-8">
          <h2
            id="kpi-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Final KPI Snapshot
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Final KPI values at simulation completion
              </caption>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    scope="col"
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Indicator
                  </th>
                  <th
                    scope="col"
                    className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32"
                  >
                    Final Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpiList.map((kpi) => {
                  const value = finalKPIs[kpi.key] ?? kpi.defaultStartValue;
                  return (
                    <tr key={kpi.key} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-brand-navy text-sm">
                        {kpi.label}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div
                            role="progressbar"
                            aria-valuenow={value}
                            aria-valuemin={kpi.minValue}
                            aria-valuemax={kpi.maxValue}
                            aria-label={`${kpi.label}: ${value} out of ${kpi.maxValue}`}
                            className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                          >
                            <div
                              className="h-full bg-brand-blue rounded-full"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="font-bold text-brand-navy tabular-nums w-8 text-right">
                            {value}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Thank you ──────────────────────────────────────────────── */}
        <section aria-labelledby="thankyou-heading" className="mb-8">
          <h2
            id="thankyou-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            What Happens Next
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <ul className="space-y-3">
              {[
                "Your decision responses, KPI outcomes, and executive recommendation have all been saved.",
                "Faculty will review your leadership profile and recommendation as part of the Academy assessment.",
                "You may return to this page at any time to review your results.",
                "If you have questions about your results, contact your Academy facilitator.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span
                    className="text-brand-gold font-bold mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Download Report (placeholder) ──────────────────────────── */}
        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="
              w-full py-4 text-center bg-gray-100 text-gray-400 font-semibold
              text-base rounded-lg cursor-not-allowed border border-gray-200
            "
          >
            Download My Report
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            Report generation coming soon. Your faculty facilitator will
            provide a full debrief.
          </p>
        </div>
      </main>
    </div>
  );
}
