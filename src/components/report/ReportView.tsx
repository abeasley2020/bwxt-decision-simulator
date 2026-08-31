/**
 * ReportView — full performance report.
 *
 * Server component. Renders all report content from a pre-loaded ReportData
 * object. Same component is reused for participant and faculty/admin views.
 *
 * Designed to render well in two modes:
 *  - Screen: full BWXT branding (navy header, crimson accents, cards on grey bg)
 *  - Print: A4/Letter-friendly layout with explicit page-break hints.
 *    Print color rendering relies on `print-color-adjust: exact` set in
 *    globals.css so the navy cover and crimson rule survive the system
 *    "Save as PDF" pipeline.
 *
 * WCAG: heading hierarchy h1 → h2 → h3; progress bars have aria-labels;
 * deltas conveyed by symbol + text + color; tables with caption + th scope.
 */

import {
  REPORT_KPI_LIST,
  REPORT_SCORE_LIST,
  SA_QUESTIONS,
  SA_RATING_LABELS,
  type ReportData,
} from "@/lib/report/loadReportData";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import type { KPIKey } from "@/engine/types";
import { formatLongDate } from "@/lib/format/date";

interface Props {
  data: ReportData;
}

const RECOMMENDATION_FIELDS: Array<{
  key: keyof NonNullable<ReportData["recommendation"]>;
  label: string;
}> = [
  { key: "prioritizedStrategy", label: "Prioritized Strategy" },
  { key: "actionPlan90Day", label: "90-Day Action Plan" },
  { key: "keyRisks", label: "Key Risks" },
  { key: "talentImplications", label: "Talent Implications" },
  { key: "communicationApproach", label: "Communication Approach" },
];

export default function ReportView({ data }: Props) {
  const {
    participant,
    cohort,
    completedAt,
    baselineKPIs,
    finalKPIs,
    finalScores,
    kpiTrajectory,
    profile,
    decisionsByRound,
    recommendation,
    selfAssessment,
  } = data;

  const scoreValues = Object.values(finalScores) as number[];
  const maxScore = Math.max(...scoreValues, 1);

  return (
    <article
      id="report-root"
      className="report-root max-w-[880px] mx-auto bg-white print:max-w-none print:mx-0"
      aria-labelledby="report-title"
    >
      {/* ── Cover Header ─────────────────────────────────────────────────── */}
      <header
        className="report-cover bg-bwxt-navy text-white px-10 py-12 print:px-8 print:py-10"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="flex items-center gap-3 mb-8">
          <span className="font-playfair font-bold text-[22px] text-white leading-none">
            BWXT
          </span>
          <div className="w-px h-5 bg-white/25" aria-hidden="true" />
          <span className="text-[13px] text-white/70 font-normal">
            Leadership Academy
          </span>
        </div>

        <p className="text-[11px] text-bwxt-crimson font-semibold uppercase tracking-[0.18em] mb-3">
          Executive Decision Simulation &mdash; Performance Report
        </p>
        <h1
          id="report-title"
          className="font-playfair font-bold text-[40px] leading-[1.1] tracking-tight"
        >
          Operation Iron Horizon
        </h1>
        <div
          className="w-[60px] h-[3px] bg-bwxt-crimson my-5"
          aria-hidden="true"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 mt-6 text-[14px]">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55 mb-1">
              Prepared For
            </dt>
            <dd className="font-semibold text-[18px] text-white leading-tight">
              {participant.fullName}
            </dd>
            <dd className="text-white/60 text-[13px] mt-0.5">
              {participant.email}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55 mb-1">
              Completed
            </dt>
            <dd className="text-white text-[15px]">{formatLongDate(completedAt)}</dd>
            {cohort && (
              <>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55 mt-3 mb-1">
                  Cohort
                </dt>
                <dd className="text-white text-[15px]">{cohort.name}</dd>
              </>
            )}
          </div>
        </dl>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="px-10 py-10 space-y-10 print:px-8 print:py-8 print:space-y-8">

        {/* ── Section: Leadership Profile ─────────────────────────────── */}
        {profile && (
          <section
            aria-labelledby="profile-heading"
            className="report-section"
          >
            <h2
              id="profile-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section I &middot; Leadership Profile
            </h2>
            <div className="border border-bwxt-border rounded-xl p-6 print:rounded-lg">
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-bwxt-navy flex items-center justify-center"
                  aria-hidden="true"
                  style={{
                    printColorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                  }}
                >
                  <span className="text-white font-bold text-[18px]">
                    {profile.label[0]}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-bwxt-text-muted uppercase tracking-[0.08em] mb-1">
                    Assigned Profile
                  </div>
                  <h3 className="font-playfair font-bold text-[24px] text-bwxt-navy leading-tight">
                    {profile.label}
                  </h3>
                  <p className="text-[15px] text-bwxt-text-secondary mt-1.5 leading-[1.65]">
                    {profile.description}
                  </p>
                </div>
              </div>
              <div className="border-t border-bwxt-border pt-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-[12px] font-semibold text-bwxt-navy uppercase tracking-[0.05em] mb-2">
                    Strengths
                  </h4>
                  <p className="text-[14px] text-bwxt-text-secondary leading-[1.65]">
                    {profile.strengthsText}
                  </p>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-bwxt-navy uppercase tracking-[0.05em] mb-2">
                    Blind Spots
                  </h4>
                  <p className="text-[14px] text-bwxt-text-secondary leading-[1.65]">
                    {profile.blindSpotsText}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section: Final KPI Values ──────────────────────────────── */}
        <section aria-labelledby="kpi-heading" className="report-section">
          <h2
            id="kpi-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
          >
            Section II &middot; Final KPI Values
          </h2>
          <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
            Indicators at simulation close, with net change versus the starting
            baseline.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {REPORT_KPI_LIST.map((kpi) => {
              const final = finalKPIs[kpi.key as KPIKey] ?? kpi.defaultStartValue;
              const baseline =
                baselineKPIs[kpi.key as KPIKey] ?? kpi.defaultStartValue;
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
                  className="border border-bwxt-border rounded-xl p-4 print:rounded-md print:p-3 print:break-inside-avoid"
                >
                  <div className="text-[11px] font-medium text-bwxt-text-muted uppercase tracking-[0.05em] mb-2 leading-tight">
                    {kpi.label}
                  </div>
                  <div className="text-[26px] font-semibold text-bwxt-navy leading-none tabular-nums mb-2">
                    {final}
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={final}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${kpi.label}: ${final} out of 100`}
                    className="h-[4px] bg-bwxt-border rounded-full overflow-hidden mb-2"
                    style={{
                      printColorAdjust: "exact",
                      WebkitPrintColorAdjust: "exact",
                    }}
                  >
                    <div
                      className="h-full bg-bwxt-navy rounded-full"
                      style={{
                        width: `${final}%`,
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                      }}
                    />
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      isPos
                        ? "text-bwxt-success bg-green-50 border-green-200"
                        : isNeg
                        ? "text-bwxt-danger bg-bwxt-crimson-light border-bwxt-crimson/20"
                        : "text-bwxt-text-muted bg-bwxt-border/40 border-bwxt-border"
                    }`}
                    aria-label={deltaText}
                    style={{
                      printColorAdjust: "exact",
                      WebkitPrintColorAdjust: "exact",
                    }}
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

        {/* ── Section: KPI Trajectory ────────────────────────────────── */}
        {kpiTrajectory.length > 1 && (
          <section
            aria-labelledby="trajectory-heading"
            className="report-section"
          >
            <h2
              id="trajectory-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section III &middot; KPI Trajectory
            </h2>
            <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
              Movement of each indicator across the three rounds. Arrows denote
              change from the previous checkpoint.
            </p>
            <div className="border border-bwxt-border rounded-xl overflow-hidden print:rounded-md">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  KPI values at each checkpoint for {participant.fullName}
                </caption>
                <thead>
                  <tr
                    className="bg-bwxt-navy-light border-b border-bwxt-border"
                    style={{
                      printColorAdjust: "exact",
                      WebkitPrintColorAdjust: "exact",
                    }}
                  >
                    <th
                      scope="col"
                      className="text-left px-4 py-3 text-[11px] font-semibold text-bwxt-text-muted uppercase tracking-[0.06em]"
                    >
                      KPI
                    </th>
                    {kpiTrajectory.map((t) => (
                      <th
                        key={t.label}
                        scope="col"
                        className="text-center px-3 py-3 text-[11px] font-semibold text-bwxt-text-muted uppercase tracking-[0.06em] whitespace-nowrap"
                      >
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bwxt-border">
                  {REPORT_KPI_LIST.map((kpi) => (
                    <tr key={kpi.key}>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-bwxt-navy leading-snug">
                        {kpi.label}
                      </td>
                      {kpiTrajectory.map((t, idx) => {
                        const val =
                          t.values[kpi.key as KPIKey] ?? kpi.defaultStartValue;
                        const prev =
                          idx > 0
                            ? (kpiTrajectory[idx - 1].values[
                                kpi.key as KPIKey
                              ] ?? kpi.defaultStartValue)
                            : val;
                        const d = val - prev;
                        return (
                          <td
                            key={t.label}
                            className="text-center px-3 py-2.5 tabular-nums font-semibold text-bwxt-navy text-[13px]"
                          >
                            {val}
                            {idx > 0 && d !== 0 && (
                              <span
                                className={`ml-1 text-[11px] ${
                                  d > 0
                                    ? "text-bwxt-success"
                                    : "text-bwxt-danger"
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
        )}

        {/* ── Section: Score Dimensions ──────────────────────────────── */}
        {scoreValues.length > 0 && (
          <section
            aria-labelledby="scores-heading"
            className="report-section report-section-break"
          >
            <h2
              id="scores-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section IV &middot; Leadership Score Dimensions
            </h2>
            <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
              Points accumulated across all decisions. Bars show relative
              strength across the seven leadership dimensions.
            </p>
            <div className="border border-bwxt-border rounded-xl divide-y divide-bwxt-border print:rounded-md">
              {REPORT_SCORE_LIST.map((dim) => {
                const score = (finalScores[dim.key] ?? 0) as number;
                const barPct =
                  maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                return (
                  <div
                    key={dim.key}
                    className="px-5 py-3.5 print:break-inside-avoid"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-bwxt-navy">
                        {dim.label}
                      </span>
                      <span className="text-[14px] font-bold text-bwxt-navy tabular-nums">
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
                      style={{
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                      }}
                    >
                      <div
                        className="h-full bg-bwxt-crimson rounded-full"
                        style={{
                          width: `${barPct}%`,
                          printColorAdjust: "exact",
                          WebkitPrintColorAdjust: "exact",
                        }}
                      />
                    </div>
                    <p className="text-[12px] text-bwxt-text-muted leading-snug">
                      {dim.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section: Decision Summary ─────────────────────────────── */}
        {decisionsByRound.size > 0 && (
          <section
            aria-labelledby="decisions-heading"
            className="report-section report-section-break"
          >
            <h2
              id="decisions-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section V &middot; Decision Summary
            </h2>
            <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
              Choices recorded during the simulation, organized by round.
            </p>
            <div className="space-y-5">
              {[1, 2, 3].map((roundNum) => {
                const entries = decisionsByRound.get(roundNum);
                if (!entries?.length) return null;

                const roundContent = IRON_HORIZON_VERSION.rounds.find(
                  (r) => r.roundNumber === roundNum
                );

                return (
                  <div key={roundNum} className="print:break-inside-avoid">
                    <h3 className="text-bwxt-navy font-semibold text-[13px] uppercase tracking-[0.06em] mb-2">
                      Round {roundNum}
                      {roundContent ? ` — ${roundContent.title}` : ""}
                    </h3>
                    <div className="border border-bwxt-border rounded-xl divide-y divide-bwxt-border print:rounded-md">
                      {entries.map((entry) => (
                        <div
                          key={entry.templateKey}
                          className="px-5 py-3.5 print:break-inside-avoid"
                        >
                          <div className="text-[14px] font-semibold text-bwxt-navy mb-2">
                            {entry.templateTitle}
                          </div>

                          {entry.decisionType === "resource_allocation" ? (
                            <ul
                              className="space-y-0.5"
                              aria-label={`Allocation for ${entry.templateTitle}`}
                            >
                              {entry.allocationLines.map((line) => (
                                <li
                                  key={line}
                                  className="text-[13px] text-bwxt-text-secondary"
                                >
                                  {line}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <ul
                              className="space-y-0.5"
                              aria-label={`Options chosen for ${entry.templateTitle}`}
                            >
                              {entry.optionLabels.map((label, i) => (
                                <li
                                  key={`${label}-${i}`}
                                  className="text-[13px] text-bwxt-text-secondary flex items-start gap-2"
                                >
                                  <span
                                    className="text-bwxt-crimson font-bold mt-0.5 flex-shrink-0"
                                    aria-hidden="true"
                                    style={{
                                      printColorAdjust: "exact",
                                      WebkitPrintColorAdjust: "exact",
                                    }}
                                  >
                                    ✓
                                  </span>
                                  {label}
                                </li>
                              ))}
                            </ul>
                          )}

                          {entry.rationale && (
                            <p className="mt-3 text-[12px] text-bwxt-text-muted italic leading-relaxed border-t border-bwxt-border/60 pt-2">
                              <span className="font-semibold not-italic text-bwxt-text-secondary">
                                Rationale:&nbsp;
                              </span>
                              {entry.rationale}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section: Executive Recommendation ──────────────────────── */}
        {recommendation && (
          <section
            aria-labelledby="recommendation-heading"
            className="report-section report-section-break"
          >
            <h2
              id="recommendation-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section VI &middot; Executive Recommendation
            </h2>
            <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
              The participant&apos;s articulated strategy and forward plan.
            </p>
            <dl className="border border-bwxt-border rounded-xl divide-y divide-bwxt-border print:rounded-md">
              {RECOMMENDATION_FIELDS.map(({ key, label }) => {
                const value = recommendation[key];
                return (
                  <div
                    key={key}
                    className="px-5 py-4 print:break-inside-avoid"
                  >
                    <dt className="text-[11px] font-semibold text-bwxt-text-muted uppercase tracking-[0.08em] mb-1.5">
                      {label}
                    </dt>
                    <dd className="text-[14px] text-bwxt-text-primary leading-[1.7] whitespace-pre-line">
                      {value || (
                        <span className="text-bwxt-text-muted italic">
                          Not provided
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* ── Section: Self-Assessment ───────────────────────────────── */}
        {Object.keys(selfAssessment).length > 0 && (
          <section
            aria-labelledby="selfassess-heading"
            className="report-section"
          >
            <h2
              id="selfassess-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bwxt-crimson mb-2"
            >
              Section VII &middot; Pre-Simulation Self-Assessment
            </h2>
            <p className="text-[14px] text-bwxt-text-secondary mb-4 leading-[1.6]">
              Self-rated context captured before the simulation began.
            </p>
            <dl className="border border-bwxt-border rounded-xl divide-y divide-bwxt-border print:rounded-md">
              {SA_QUESTIONS.map((q) => {
                const value = selfAssessment[q.key];
                if (!value && q.type === "text") return null;
                return (
                  <div
                    key={q.key}
                    className="px-5 py-4 print:break-inside-avoid"
                  >
                    <dt className="text-[11px] font-semibold text-bwxt-text-muted uppercase tracking-[0.08em] mb-1.5">
                      {q.label}
                    </dt>
                    <dd className="text-[14px] text-bwxt-text-primary">
                      {q.type === "rating" ? (
                        <>
                          <span className="font-bold text-bwxt-navy tabular-nums">
                            {value ?? "—"}
                          </span>
                          {value && (
                            <span className="text-bwxt-text-secondary ml-2">
                              — {SA_RATING_LABELS[value] ?? ""}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="leading-[1.65] whitespace-pre-line">
                          {value || (
                            <span className="text-bwxt-text-muted italic">
                              Not provided
                            </span>
                          )}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="pt-6 mt-2 border-t border-bwxt-border">
          <p className="text-[11px] text-bwxt-text-muted text-center leading-relaxed">
            BWXT Leadership Academy &middot; Operation Iron Horizon &middot;{" "}
            Confidential &mdash; for participant and faculty review.
          </p>
        </footer>
      </div>
    </article>
  );
}
