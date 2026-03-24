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
import SimulationNav from "@/components/SimulationNav";
import PreviewBanner from "@/components/simulation/PreviewBanner";
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
      "id, status, user_id, scenario_version_id, final_profile_id, completed_at, is_preview"
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
    <div className="min-h-screen bg-bwxt-bg">
      <SimulationNav />
      {run.is_preview && <PreviewBanner />}

      {/* Status bar */}
      <div className="bg-bwxt-navy-light border-b border-bwxt-border">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center gap-3">
          <span className="bg-bwxt-crimson text-white text-[12px] font-semibold px-3 py-1 rounded-full">
            Simulation Complete
          </span>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-8 space-y-8">

        {/* ── Confirmation ────────────────────────────────────────────── */}
        <section aria-labelledby="confirm-heading">
          <h2 id="confirm-heading" className="sr-only">
            Completion Confirmation
          </h2>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-8 text-center">
            <div
              className="w-14 h-14 rounded-full bg-bwxt-crimson flex items-center justify-center mx-auto mb-5"
              aria-hidden="true"
            >
              <span className="text-white text-2xl font-bold">&#10003;</span>
            </div>
            <h2 className="font-playfair font-bold text-[24px] text-bwxt-navy mb-2">
              Simulation Successfully Completed
            </h2>
            {completedDate && (
              <p className="text-bwxt-text-muted text-[13px] mb-4">
                Completed on {completedDate}
              </p>
            )}
            <p className="text-[15px] text-bwxt-text-secondary leading-[1.65] max-w-md mx-auto">
              Your decisions across all three rounds and your executive
              recommendation have been recorded. Your outputs will be
              reviewed by faculty as part of the BWXT Leadership Academy
              assessment process.
            </p>
          </div>
        </section>

        {/* ── Assigned Profile ────────────────────────────────────────── */}
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

        {/* ── Final KPI Snapshot ──────────────────────────────────────── */}
        <section aria-labelledby="kpi-heading">
          <h2
            id="kpi-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            Final KPI Snapshot
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpiList.map((kpi) => {
              const value = finalKPIs[kpi.key] ?? kpi.defaultStartValue;
              return (
                <div
                  key={kpi.key}
                  className="bg-white border border-bwxt-border rounded-xl shadow-card p-4"
                >
                  <div className="text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.05em] mb-2">
                    {kpi.label}
                  </div>
                  <div className="text-[28px] font-semibold text-bwxt-navy leading-none tabular-nums mb-3">
                    {value}
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={kpi.minValue}
                    aria-valuemax={kpi.maxValue}
                    aria-label={`${kpi.label}: ${value} out of ${kpi.maxValue}`}
                    className="h-[4px] bg-bwxt-border rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-bwxt-navy rounded-full"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── What Happens Next ──────────────────────────────────────── */}
        <section aria-labelledby="thankyou-heading">
          <h2
            id="thankyou-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            What Happens Next
          </h2>
          <ul className="bg-white border border-bwxt-border rounded-xl shadow-card divide-y divide-bwxt-border">
            {[
              "Your decision responses, KPI outcomes, and executive recommendation have all been saved.",
              "Faculty will review your leadership profile and recommendation as part of the Academy assessment.",
              "You may return to this page at any time to review your results.",
              "If you have questions about your results, contact your Academy facilitator.",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-5 py-4 text-[15px] text-bwxt-text-primary"
              >
                <span
                  className="text-bwxt-crimson font-bold mt-0.5 flex-shrink-0 text-[16px]"
                  aria-hidden="true"
                >
                  &#10003;
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Download Report (placeholder) ──────────────────────────── */}
        <div className="border-t border-bwxt-border pt-6">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="
              bg-bwxt-border/40 text-bwxt-text-muted cursor-not-allowed
              border border-bwxt-border rounded-[14px] py-[14px] w-full
              font-semibold text-[15px]
            "
          >
            Download My Report
          </button>
          <p className="mt-2 text-center text-[13px] text-bwxt-text-muted">
            Report generation coming soon. Your faculty facilitator will
            provide a full debrief.
          </p>
        </div>
      </main>
    </div>
  );
}
