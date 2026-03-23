/**
 * Orientation page — shown before Round 1.
 *
 * Displays:
 *  - Scenario purpose and context
 *  - Participant role
 *  - The seven scoring (evaluation) dimensions
 *  - Initial KPI baseline values
 *  - Self-assessment form
 *  - Begin Simulation button (form POST to begin API)
 *
 * The self-assessment is submitted along with the Begin form, so no
 * separate save step is needed. HTML5 required attributes enforce
 * completion before the form can be submitted.
 *
 * WCAG: semantic heading hierarchy; all inputs labeled; native form
 * validation via required; visible focus styles throughout.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import SelfAssessmentForm from "@/components/orientation/SelfAssessmentForm";

interface Props {
  params: { runId: string };
}

export default async function OrientationPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "completed") redirect(`/simulation/${run.id}/complete`);
  if (run.status === "in_progress") {
    redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
  }

  const initialKPIs = buildInitialKPIs();
  const kpiList = Object.values(KPI_DEFINITIONS);
  const scoringList = Object.values(SCORING_DIMENSIONS);

  return (
    <div className="min-h-screen bg-brand-light">
      {/* Header */}
      <header className="bg-brand-navy text-white px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <div
            className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-1"
            aria-hidden="true"
          >
            BWXT Leadership Academy
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Operation Iron Horizon
          </h1>
          <p className="text-white/50 text-sm mt-0.5">
            Executive Decision Simulation &mdash; Orientation
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Scenario intro ─────────────────────────────────────────────── */}
        <section aria-labelledby="section-scenario" className="mb-10">
          <h2
            id="section-scenario"
            className="text-brand-navy text-xl font-bold mb-4"
          >
            Your Scenario
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {IRON_HORIZON_VERSION.introContent
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p
                  key={i}
                  className="text-gray-700 text-sm leading-relaxed mb-3 last:mb-0"
                >
                  {line}
                </p>
              ))}
          </div>
        </section>

        {/* ── Simulation logistics ───────────────────────────────────────── */}
        <section aria-labelledby="section-logistics" className="mb-10">
          <h2
            id="section-logistics"
            className="text-brand-navy text-xl font-bold mb-4"
          >
            Before You Begin
          </h2>
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              `This simulation takes approximately ${IRON_HORIZON_VERSION.estimatedDurationMinutes} minutes to complete.`,
              "You will face three rounds of decisions, each with real consequences.",
              "Your decisions are logged and cannot be changed once submitted.",
              "Write your rationale thoughtfully — it signals how you think, not just what you choose.",
              "You can pause and return at any time. Your progress is saved automatically.",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-5 py-4 text-sm text-gray-700"
              >
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
        </section>

        {/* ── Evaluation dimensions ──────────────────────────────────────── */}
        <section aria-labelledby="section-dimensions" className="mb-10">
          <h2
            id="section-dimensions"
            className="text-brand-navy text-xl font-bold mb-1"
          >
            What You Will Be Evaluated On
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Your decisions are scored across seven leadership dimensions.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {scoringList.map((dim) => (
              <div
                key={dim.key}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="font-semibold text-sm text-brand-navy mb-0.5">
                  {dim.label}
                </div>
                <div className="text-xs text-gray-500 leading-snug">
                  {dim.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── KPI baseline ───────────────────────────────────────────────── */}
        <section aria-labelledby="section-kpis" className="mb-10">
          <h2
            id="section-kpis"
            className="text-brand-navy text-xl font-bold mb-1"
          >
            Your Starting KPI Baseline
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            These are the division&apos;s indicators when you take over. Your
            decisions will move them up or down.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Initial KPI values at the start of your simulation
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
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24"
                  >
                    Starting
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpiList.map((kpi) => {
                  const value = initialKPIs[kpi.key];
                  return (
                    <tr key={kpi.key} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold text-brand-navy">
                        {kpi.label}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs leading-snug">
                        {kpi.description}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Accessible progress bar */}
                          <div
                            role="progressbar"
                            aria-valuenow={value}
                            aria-valuemin={kpi.minValue}
                            aria-valuemax={kpi.maxValue}
                            aria-label={`${kpi.label}: ${value} out of ${kpi.maxValue}`}
                            className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                          >
                            <div
                              className="h-full bg-brand-blue rounded-full"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="font-semibold text-brand-navy tabular-nums w-8 text-right">
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

        {/* ── Self-assessment + Begin form ───────────────────────────────── */}
        <section aria-labelledby="section-selfassess" className="mb-10">
          <h2
            id="section-selfassess"
            className="text-brand-navy text-xl font-bold mb-1"
          >
            Self-Assessment
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Before you begin, answer four short questions about your current
            experience level. This helps calibrate your results and is not
            scored.
          </p>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {/*
             * All self-assessment fields and the Begin button are in one form.
             * Required attributes on radio groups enforce completion via the
             * browser's built-in validation before the form can POST.
             */}
            <form
              action={`/api/simulation/${params.runId}/begin`}
              method="POST"
            >
              <SelfAssessmentForm />

              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  className="
                    w-full py-4 bg-brand-gold text-brand-navy font-bold text-base
                    rounded-lg hover:bg-brand-gold/90 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
                  "
                >
                  Begin Simulation
                </button>
                <p className="mt-3 text-center text-xs text-gray-400">
                  Your first decision begins immediately after you click this
                  button.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
