/**
 * Orientation page — shown before Round 1.
 *
 * Displays:
 *  - Scenario purpose and context (executive intelligence brief)
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

      {/* ── Top hero: simulation title + meta badges ───────────────────── */}
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

      {/* ── Scenario Brief: role title + mandate ──────────────────────── */}
      <div style={{ backgroundColor: "#17153A" }}>
        <div
          className="mx-auto px-6 text-center"
          style={{ maxWidth: "880px", paddingTop: "64px", paddingBottom: "56px" }}
        >
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "11px",
              letterSpacing: "0.12em",
              color: "#C93147",
              textTransform: "uppercase",
              marginBottom: "20px",
            }}
          >
            Operation Iron Horizon
          </p>
          <h2
            className="font-playfair font-bold text-white"
            style={{ fontSize: "36px", lineHeight: 1.2 }}
          >
            Acting President, BWXT Nuclear Division
          </h2>
          <div
            aria-hidden="true"
            style={{
              width: "56px",
              height: "3px",
              backgroundColor: "#C93147",
              margin: "20px auto",
            }}
          />
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "16px",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            90-Day Mandate.&nbsp; Three Rounds.&nbsp; Real Consequences.
          </p>
        </div>
      </div>

      {/* ── Situation brief card + four challenge cards ────────────────── */}
      <div className="bg-bwxt-bg">
        <div className="mx-auto px-6 py-12" style={{ maxWidth: "760px" }}>
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #E0DFF0",
              borderRadius: "12px",
              padding: "40px",
            }}
          >
            {/* Section label */}
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.10em",
                color: "#C93147",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Situation Brief
            </p>

            {/* Opening paragraphs — Playfair italic */}
            <p
              className="font-playfair"
              style={{
                fontStyle: "italic",
                fontSize: "18px",
                color: "#17153A",
                lineHeight: 1.7,
                marginBottom: "16px",
              }}
            >
              You have just been named Acting President of BWXT&apos;s largest
              operating division. The division generates $2.4B in annual revenue
              across defense manufacturing, commercial nuclear services, and
              emerging government technology contracts.
            </p>
            <p
              className="font-playfair"
              style={{
                fontStyle: "italic",
                fontSize: "18px",
                color: "#17153A",
                lineHeight: 1.7,
              }}
            >
              You have 90 days to demonstrate executive leadership before the
              Board confirms your appointment permanently.
            </p>

            {/* Divider */}
            <div
              aria-hidden="true"
              style={{
                height: "1px",
                backgroundColor: "#E0DFF0",
                margin: "28px 0",
              }}
            />

            {/* Four challenge cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  category: "Contract Margin",
                  title: "Defense Margin Pressure",
                  body: "A competitor's recent bid has placed BWXT's core defense contracts under significant margin pressure.",
                },
                {
                  category: "Compliance Risk",
                  title: "Nuclear Safety Audit",
                  body: "A mandatory safety audit is scheduled in 60 days. Potential compliance exposure has not yet been resolved.",
                },
                {
                  category: "Execution Lag",
                  title: "Digital Transformation",
                  body: "The division's digital transformation program is running 18 months behind its original delivery schedule.",
                },
                {
                  category: "Talent Retention",
                  title: "Direct Report Flight Risk",
                  body: "Two of your six direct reports are considered flight risks and may require immediate attention.",
                },
              ].map((card) => (
                <div
                  key={card.category}
                  style={{
                    backgroundColor: "#FAFAFA",
                    border: "1px solid #E0DFF0",
                    borderLeft: "3px solid #C93147",
                    borderRadius: "8px",
                    padding: "18px 20px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontWeight: 600,
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      color: "#C93147",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {card.category}
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      color: "#17153A",
                      marginBottom: "6px",
                    }}
                  >
                    {card.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontWeight: 400,
                      fontSize: "13px",
                      color: "#6B7280",
                      lineHeight: 1.55,
                    }}
                  >
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Remaining orientation content ─────────────────────────────── */}
      <main className="max-w-[880px] mx-auto px-6 pb-10 space-y-10">

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
