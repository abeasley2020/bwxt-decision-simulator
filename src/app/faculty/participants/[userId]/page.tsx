/**
 * Faculty Participant Detail — /faculty/participants/[userId]
 *
 * Shows a single participant's full simulation record:
 *  - Name, status, and assigned leadership profile (with strengths + blind spots)
 *  - Final KPI values (8) with progress bars and net change vs. baseline
 *  - Final score values (7 dimensions) with relative bars
 *  - Decision summary per round (option labels or allocation breakdown)
 *  - Executive recommendation (all 5 fields)
 *  - Self-assessment responses
 *
 * Access control: faculty and admin only.
 * The target participant must belong to the same cohort as the viewing faculty.
 * Data: server-side only, read-only.
 *
 * WCAG: h1→h2→h3 heading hierarchy; progress bars with aria labels;
 * deltas conveyed by symbol + text + color; tables with caption + th scope;
 * all sections use aria-labelledby.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveFacultyCohort } from "@/lib/faculty/getActiveFacultyCohort";
import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import type { KPIValues, ScoreValues, KPIKey, PerformanceProfileKey } from "@/engine/types";

// ─── Content lookups (built once, not re-computed per render) ─────────────────

// option key → option label
const OPTION_LABEL_MAP = new Map<string, string>();
// template key → { title, roundNumber, decisionType }
const TEMPLATE_INFO_MAP = new Map<
  string,
  { title: string; roundNumber: number; decisionType: string }
>();

for (const round of IRON_HORIZON_VERSION.rounds) {
  for (const template of round.decisions) {
    TEMPLATE_INFO_MAP.set(template.key, {
      title: template.title,
      roundNumber: round.roundNumber,
      decisionType: template.decisionType,
    });
    for (const opt of template.options) {
      OPTION_LABEL_MAP.set(opt.key, opt.label);
    }
  }
}

// profile key → profile (from content files — authoritative for display text)
const PROFILE_MAP = new Map(PERFORMANCE_PROFILES.map((p) => [p.key, p]));

// ─── Self-assessment question labels ──────────────────────────────────────────

const SA_QUESTIONS = [
  {
    key: "sa_q1",
    label: "Confidence in high-stakes financial decisions",
    type: "rating",
  },
  {
    key: "sa_q2",
    label: "Experience with talent and leadership challenges",
    type: "rating",
  },
  {
    key: "sa_q3",
    label: "Familiarity with regulatory and compliance environments",
    type: "rating",
  },
  {
    key: "sa_q4",
    label: "Primary leadership concern at start of simulation",
    type: "text",
  },
] as const;

const RATING_LABELS: Record<string, string> = {
  "1": "Minimal",
  "2": "Some",
  "3": "Moderate",
  "4": "Strong",
  "5": "Expert",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { userId: string };
}

export default async function ParticipantDetailPage({ params }: Props) {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role === "participant") {
    redirect("/simulation");
  }

  // ── Cohort selection ────────────────────────────────────────────────────────

  const cohort = await getActiveFacultyCohort(supabase, user.id);
  if (!cohort) notFound();

  // ── Verify participant belongs to this cohort ─────────────────────────────

  const { data: membership } = await supabase
    .from("cohort_memberships")
    .select("user_id")
    .eq("cohort_id", cohort.id)
    .eq("user_id", params.userId)
    .eq("cohort_role", "participant")
    .maybeSingle();

  if (!membership) notFound();

  // ── Load participant user info ────────────────────────────────────────────

  const { data: participantUser } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", params.userId)
    .maybeSingle();

  if (!participantUser) notFound();

  // ── Load simulation run ───────────────────────────────────────────────────

  const { data: run } = await supabase
    .from("simulation_runs")
    .select(
      "id, status, current_round_number, final_profile_id, self_assessment_json, completed_at, started_at"
    )
    .eq("cohort_id", cohort.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  // Participant may not have started yet
  if (!run || run.status === "not_started") {
    return (
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href="/faculty/participants"
            className="
              text-xs text-brand-blue font-medium hover:underline
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
            "
          >
            ← Back to Participants
          </Link>
          <h1 className="text-2xl font-bold text-brand-navy mt-2 mb-1">
            {participantUser.first_name} {participantUser.last_name}
          </h1>
          <p className="text-gray-500 text-sm">{participantUser.email}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">
          This participant has not started the simulation yet.
        </div>
      </main>
    );
  }

  // ── Load scenario rounds ──────────────────────────────────────────────────

  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", cohort.scenario_version_id)
    .order("round_number");

  const roundIdToNumber = new Map(
    (scenarioRounds ?? []).map((r: { id: string; round_number: number }) => [
      r.id,
      r.round_number,
    ])
  );
  const round3Id = (scenarioRounds ?? []).find(
    (r: { round_number: number }) => r.round_number === 3
  )?.id as string | undefined;

  // ── Load all data in parallel ─────────────────────────────────────────────

  const [
    kpiSnapshotsRes,
    scoreSnapshotsRes,
    decisionResponsesRes,
    templateRowsRes,
    recommendationRes,
    dbProfilesRes,
  ] = await Promise.all([
    // All KPI snapshots (for baseline + round values)
    supabase
      .from("kpi_snapshots")
      .select("snapshot_type, scenario_round_id, kpi_values_json")
      .eq("simulation_run_id", run.id)
      .order("captured_at"),

    // Final score snapshot (round 3 round_end)
    round3Id
      ? supabase
          .from("score_snapshots")
          .select("score_values_json")
          .eq("simulation_run_id", run.id)
          .eq("scenario_round_id", round3Id)
          .eq("snapshot_type", "round_end")
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Decision responses
    supabase
      .from("decision_responses")
      .select(
        "decision_template_id, scenario_round_id, selected_option_ids_json, allocation_json, short_rationale_text"
      )
      .eq("simulation_run_id", run.id)
      .order("responded_at"),

    // Template id → key mapping
    supabase
      .from("decision_templates")
      .select("id, key")
      .in(
        "scenario_round_id",
        (scenarioRounds ?? []).map((r: { id: string }) => r.id)
      ),

    // Executive recommendation
    supabase
      .from("executive_recommendations")
      .select(
        "prioritized_strategy, action_plan_90_day, key_risks, talent_implications, communication_approach"
      )
      .eq("simulation_run_id", run.id)
      .maybeSingle(),

    // Performance profiles (for profile key lookup by ID)
    supabase
      .from("performance_profiles")
      .select("id, key"),
  ]);

  // ── Build KPI values ────────────────────────────────────────────────────

  const allKpiSnapshots: Array<{
    snapshot_type: string;
    scenario_round_id: string | null;
    kpi_values_json: Record<string, number>;
  }> = kpiSnapshotsRes.data ?? [];

  const baselineKPIs = (allKpiSnapshots.find(
    (s) => s.snapshot_type === "initial"
  )?.kpi_values_json ?? buildInitialKPIs()) as KPIValues;

  // Final KPIs = round 3 round_end snapshot (or round 2, or round 1 as fallback)
  const finalKpiSnapshot = round3Id
    ? allKpiSnapshots.find(
        (s) =>
          s.snapshot_type === "round_end" && s.scenario_round_id === round3Id
      )
    : null;
  const finalKPIs = (finalKpiSnapshot?.kpi_values_json ?? baselineKPIs) as KPIValues;
  const finalScores = (scoreSnapshotsRes.data?.score_values_json ??
    {}) as ScoreValues;

  // KPI trajectory: baseline → R1 → R2 → R3
  function getRoundEndKPIs(roundNum: number): KPIValues | null {
    const rid = (scenarioRounds ?? []).find(
      (r: { round_number: number }) => r.round_number === roundNum
    )?.id;
    if (!rid) return null;
    const snap = allKpiSnapshots.find(
      (s) => s.snapshot_type === "round_end" && s.scenario_round_id === rid
    );
    return snap ? (snap.kpi_values_json as KPIValues) : null;
  }

  const r1KPIs = getRoundEndKPIs(1);
  const r2KPIs = getRoundEndKPIs(2);
  const r3KPIs = getRoundEndKPIs(3);

  const kpiTrajectory = [
    { label: "Baseline", values: baselineKPIs },
    ...(r1KPIs ? [{ label: "Round 1", values: r1KPIs }] : []),
    ...(r2KPIs ? [{ label: "Round 2", values: r2KPIs }] : []),
    ...(r3KPIs ? [{ label: "Round 3", values: r3KPIs }] : []),
  ];

  // ── Profile display ─────────────────────────────────────────────────────

  let assignedProfileKey: string | null = null;
  if (run.final_profile_id) {
    const dbProfiles: Array<{ id: string; key: string }> =
      dbProfilesRes.data ?? [];
    const matched = dbProfiles.find((p) => p.id === run.final_profile_id);
    assignedProfileKey = matched?.key ?? null;
  }
  const displayProfile = assignedProfileKey
    ? (PROFILE_MAP.get(assignedProfileKey as PerformanceProfileKey) ?? null)
    : null;

  // ── Score bar scale ─────────────────────────────────────────────────────

  const scoreValues = Object.values(finalScores) as number[];
  const maxScore = Math.max(...scoreValues, 1);

  // ── Decision summary ────────────────────────────────────────────────────

  const templateIdToKey = new Map(
    (templateRowsRes.data ?? []).map((t: { id: string; key: string }) => [
      t.id,
      t.key,
    ])
  );

  type DecisionEntry = {
    roundNumber: number;
    templateKey: string;
    templateTitle: string;
    decisionType: string;
    optionLabels: string[];
    allocationLines: string[];
    rationale: string | null;
  };

  const decisionEntries: DecisionEntry[] = (
    decisionResponsesRes.data ?? []
  ).map(
    (resp: {
      decision_template_id: string;
      scenario_round_id: string;
      selected_option_ids_json: string[];
      allocation_json: Record<string, number> | null;
      short_rationale_text: string | null;
    }) => {
      const templateKey = templateIdToKey.get(resp.decision_template_id) ?? "";
      const info = TEMPLATE_INFO_MAP.get(templateKey);
      const roundNumber =
        info?.roundNumber ??
        roundIdToNumber.get(resp.scenario_round_id) ??
        0;

      const optionLabels =
        resp.selected_option_ids_json.map(
          (k) => OPTION_LABEL_MAP.get(k) ?? k
        );

      const allocationLines =
        resp.allocation_json
          ? Object.entries(resp.allocation_json)
              .sort(([, a], [, b]) => b - a)
              .map(([key, pct]) => `${OPTION_LABEL_MAP.get(key) ?? key}: ${pct}%`)
          : [];

      return {
        roundNumber,
        templateKey,
        templateTitle: info?.title ?? templateKey,
        decisionType: info?.decisionType ?? "",
        optionLabels,
        allocationLines,
        rationale: resp.short_rationale_text,
      };
    }
  );

  // Group by round
  const decisionsByRound = new Map<number, DecisionEntry[]>();
  for (const entry of decisionEntries) {
    const list = decisionsByRound.get(entry.roundNumber) ?? [];
    list.push(entry);
    decisionsByRound.set(entry.roundNumber, list);
  }

  // ── Self-assessment ─────────────────────────────────────────────────────

  const saJson = (run.self_assessment_json ?? {}) as Record<string, string>;

  // ── Helpers ─────────────────────────────────────────────────────────────

  const statusLabel: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    not_started: "Not Started",
  };
  const statusClass: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    not_started: "bg-gray-100 text-gray-600",
  };

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const kpiList = Object.values(KPI_DEFINITIONS);
  const scoreList = Object.values(SCORING_DIMENSIONS);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">

      {/* ── Breadcrumb / back link ───────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/faculty/participants"
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Participants
        </Link>
      </div>

      {/* ── Participant header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            {participantUser.first_name} {participantUser.last_name}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{participantUser.email}</p>
          {run.completed_at && (
            <p className="text-gray-400 text-xs mt-1">
              Completed {formatDate(run.completed_at)}
            </p>
          )}
        </div>
        <span
          className={`
            text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mt-1
            ${statusClass[run.status] ?? "bg-gray-100 text-gray-600"}
          `}
        >
          {statusLabel[run.status] ?? run.status}
        </span>
      </div>

      {/* ── Leadership Profile ───────────────────────────────────────────── */}
      {displayProfile && (
        <section aria-labelledby="profile-heading" className="mb-8">
          <h2
            id="profile-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Assigned Leadership Profile
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-5">
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
                  Leadership Profile
                </div>
                <h3 className="text-brand-navy text-xl font-bold">
                  {displayProfile.label}
                </h3>
                <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                  {displayProfile.description}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5 pt-5 border-t border-gray-100">
              <div>
                <h4 className="text-sm font-semibold text-brand-navy mb-2">
                  Strengths
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {displayProfile.strengthsText}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-navy mb-2">
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

      {/* ── Final KPI Values ─────────────────────────────────────────────── */}
      {run.status === "completed" && (
        <section aria-labelledby="kpi-heading" className="mb-8">
          <h2
            id="kpi-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Final KPI Values
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {kpiList.map((kpi) => {
              const final = finalKPIs[kpi.key as KPIKey] ?? kpi.defaultStartValue;
              const baseline = baselineKPIs[kpi.key as KPIKey] ?? kpi.defaultStartValue;
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
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    {kpi.label}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-brand-navy tabular-nums">
                      {final}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={final}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${kpi.label}: ${final} out of 100`}
                    className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2"
                  >
                    <div
                      className="h-full bg-brand-blue rounded-full"
                      style={{ width: `${final}%` }}
                    />
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isPos
                        ? "text-green-700"
                        : isNeg
                        ? "text-red-700"
                        : "text-gray-400"
                    }`}
                    aria-label={deltaText}
                  >
                    <span aria-hidden="true">
                      {isPos ? "▲" : isNeg ? "▼" : "="}
                    </span>
                    <span>
                      {isPos ? `+${delta}` : isNeg ? `${delta}` : "0"} from
                      baseline
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── KPI Trajectory ───────────────────────────────────────────────── */}
      {kpiTrajectory.length > 1 && (
        <section aria-labelledby="trajectory-heading" className="mb-8">
          <h2
            id="trajectory-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            KPI Trajectory
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <caption className="sr-only">
                KPI values at each checkpoint for{" "}
                {participantUser.first_name} {participantUser.last_name}
              </caption>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    KPI
                  </th>
                  {kpiTrajectory.map((t) => (
                    <th
                      key={t.label}
                      scope="col"
                      className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpiList.map((kpi) => (
                  <tr key={kpi.key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-brand-navy text-xs leading-snug">
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
                        <td key={t.label} className="px-3 py-3 text-center">
                          <span className="font-semibold tabular-nums text-brand-navy">
                            {val}
                          </span>
                          {idx > 0 && d !== 0 && (
                            <span
                              className={`ml-1 text-xs ${
                                d > 0 ? "text-green-600" : "text-red-600"
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

      {/* ── Score Dimensions ─────────────────────────────────────────────── */}
      {scoreValues.length > 0 && (
        <section aria-labelledby="scores-heading" className="mb-8">
          <h2
            id="scores-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Leadership Score Dimensions
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {scoreList.map((dim) => {
              const score = (finalScores[dim.key] ?? 0) as number;
              const barPct =
                maxScore > 0
                  ? Math.round((score / maxScore) * 100)
                  : 0;
              return (
                <div key={dim.key} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-brand-navy">
                      {dim.label}
                    </span>
                    <span className="text-sm font-bold text-brand-navy tabular-nums">
                      {score} pts
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={maxScore}
                    aria-label={`${dim.label}: ${score} points`}
                    className="h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-brand-blue rounded-full"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Decision Summary ─────────────────────────────────────────────── */}
      {decisionEntries.length > 0 && (
        <section aria-labelledby="decisions-heading" className="mb-8">
          <h2
            id="decisions-heading"
            className="text-brand-navy text-lg font-bold mb-4"
          >
            Decision Summary
          </h2>
          <div className="space-y-6">
            {[1, 2, 3].map((roundNum) => {
              const entries = decisionsByRound.get(roundNum);
              if (!entries?.length) return null;

              // Find round title from content
              const roundContent = IRON_HORIZON_VERSION.rounds.find(
                (r) => r.roundNumber === roundNum
              );

              return (
                <div key={roundNum}>
                  <h3 className="text-brand-navy font-semibold text-sm uppercase tracking-wide mb-3">
                    Round {roundNum}
                    {roundContent ? ` — ${roundContent.title}` : ""}
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {entries.map((entry) => (
                      <div key={entry.templateKey} className="px-5 py-4">
                        <div className="text-sm font-semibold text-brand-navy mb-2">
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
                                className="text-sm text-gray-600"
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
                            {entry.optionLabels.map((label) => (
                              <li
                                key={label}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <span
                                  className="text-brand-gold font-bold mt-0.5 flex-shrink-0"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                                {label}
                              </li>
                            ))}
                          </ul>
                        )}

                        {entry.rationale && (
                          <p className="mt-3 text-xs text-gray-500 italic leading-relaxed border-t border-gray-50 pt-2">
                            <span className="font-semibold not-italic text-gray-600">
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

      {/* ── Executive Recommendation ─────────────────────────────────────── */}
      {recommendationRes.data && (
        <section aria-labelledby="recommendation-heading" className="mb-8">
          <h2
            id="recommendation-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Executive Recommendation
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              {
                label: "Prioritized Strategy",
                value: recommendationRes.data.prioritized_strategy,
              },
              {
                label: "90-Day Action Plan",
                value: recommendationRes.data.action_plan_90_day,
              },
              {
                label: "Key Risks",
                value: recommendationRes.data.key_risks,
              },
              {
                label: "Talent Implications",
                value: recommendationRes.data.talent_implications,
              },
              {
                label: "Communication Approach",
                value: recommendationRes.data.communication_approach,
              },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-4">
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label}
                </dt>
                <dd className="text-sm text-gray-700 leading-relaxed">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Self-Assessment ──────────────────────────────────────────────── */}
      {run.self_assessment_json && (
        <section aria-labelledby="selfassess-heading" className="mb-8">
          <h2
            id="selfassess-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Pre-Simulation Self-Assessment
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {SA_QUESTIONS.map((q) => {
              const value = saJson[q.key];
              if (!value && q.type === "text") return null;
              return (
                <div key={q.key} className="px-5 py-4">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {q.label}
                  </dt>
                  <dd className="text-sm text-gray-700">
                    {q.type === "rating" ? (
                      <>
                        <span className="font-bold text-brand-navy tabular-nums">
                          {value ?? "—"}
                        </span>
                        {value && (
                          <span className="text-gray-500 ml-1">
                            — {RATING_LABELS[value] ?? ""}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="leading-relaxed">
                        {value || <span className="text-gray-400">Not provided</span>}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
