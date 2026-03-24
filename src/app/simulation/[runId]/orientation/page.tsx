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
import PreviewBanner from "@/components/simulation/PreviewBanner";

interface Props {
  params: { runId: string };
}

export default async function OrientationPage({ params }: Props) {
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
    .select("id, status, current_round_number, user_id, is_preview")
    .eq("id", params.runId)
    .eq("user_id", userId)
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
    <div className="min-h-screen bg-bwxt-bg">
      {run.is_preview && <PreviewBanner />}

      {/* Hero section — full bleed navy */}
      <div className="bg-bwxt-navy">
        <div className="max-w-[880px] mx-auto px-6 py-16">
          <h1 className="font-playfair font-bold text-[44px] text-white leading-tight tracking-tight">
            Operation Iron Horizon
          </h1>
          <div className="w-[60px] h-[3px] bg-bwxt-crimson my-4" aria-hidden="true" />
          <p className="text-[16px] text-white/70">
            Executive Decision Simulation &mdash; Leadership Assessment
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white text-[13px] font-medium">
              ~{IRON_HORIZON_VERSION.estimatedDurationMinutes} min
            </span>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white text-[13px] font-medium">
              3 Rounds &middot; 12 Decisions
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-10 space-y-10">
        {/* ── Your Scenario ──────────────────────────────────────────────── */}
        <section aria-labelledby="section-scenario">
          <h2
            id="section-scenario"
            className="text-[18px] font-semibold text-bwxt-navy mb-4"
          >
            Your Scenario
          </h2>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
            {IRON_HORIZON_VERSION.introContent
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p
                  key={i}
                  className="text-[15px] text-bwxt-text-primary leading-[1.65] mb-3 last:mb-0"
                >
                  {line}
                </p>
              ))}
          </div>
        </section>

        {/* ── Before You Begin ───────────────────────────────────────────── */}
        <section aria-labelledby="section-logistics">
          <h2
            id="section-logistics"
            className="text-[18px] font-semibold text-bwxt-navy mb-4"
          >
            Before You Begin
          </h2>
          <ul className="bg-white border border-bwxt-border rounded-xl shadow-card divide-y divide-bwxt-border">
            {[
              `This simulation takes approximately ${IRON_HORIZON_VERSION.estimatedDurationMinutes} minutes to complete.`,
              "You will face three rounds of decisions, each with real consequences.",
              "Your decisions are logged and cannot be changed once submitted.",
              "Write your rationale thoughtfully — it signals how you think, not just what you choose.",
              "You can pause and return at any time. Your progress is saved automatically.",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-5 py-4 text-[15px] text-bwxt-text-primary"
              >
                <span
                  className="text-bwxt-crimson font-bold mt-0.5 flex-shrink-0 text-[16px]"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Evaluation Dimensions ──────────────────────────────────────── */}
        <section aria-labelledby="section-dimensions">
          <h2
            id="section-dimensions"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            What You Will Be Evaluated On
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            Your decisions are scored across seven leadership dimensions.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {scoringList.map((dim) => (
              <div
                key={dim.key}
                className="bg-white border border-bwxt-border rounded-xl shadow-card px-4 py-3"
              >
                <div className="font-semibold text-[14px] text-bwxt-navy mb-1">
                  {dim.label}
                </div>
                <div className="text-[13px] text-bwxt-text-secondary leading-snug">
                  {dim.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Your Starting Position ─────────────────────────────────────── */}
        <section aria-labelledby="section-kpis">
          <h2
            id="section-kpis"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            Your Starting Position
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-4">
            These are the division&apos;s indicators when you take over. Your
            decisions will move them up or down.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpiList.map((kpi) => {
              const value = initialKPIs[kpi.key];
              return (
                <div
                  key={kpi.key}
                  className="bg-white border border-bwxt-border rounded-xl shadow-card p-4"
                >
                  <div className="text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.05em] mb-2">
                    {kpi.label}
                  </div>
                  <div className="text-[28px] font-semibold text-bwxt-navy leading-none mb-3 tabular-nums">
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

        {/* ── Self-Assessment + Begin Form ───────────────────────────────── */}
        <section aria-labelledby="section-selfassess">
          <h2
            id="section-selfassess"
            className="text-[18px] font-semibold text-bwxt-navy mb-1"
          >
            Self-Assessment
          </h2>
          <p className="text-[15px] text-bwxt-text-secondary mb-6">
            Before you begin, answer four short questions about your current
            experience level. This helps calibrate your results and is not
            scored.
          </p>

          <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
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

              <div className="mt-8 pt-6 border-t border-bwxt-border">
                <button
                  type="submit"
                  className="
                    w-full max-w-[440px] mx-auto block py-[14px] bg-bwxt-navy text-white
                    font-semibold text-[15px] rounded-[14px] hover:bg-bwxt-navy-dark
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
                  "
                >
                  Begin Simulation &rarr;
                </button>
                <p className="text-center text-[13px] text-bwxt-text-muted mt-3">
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
