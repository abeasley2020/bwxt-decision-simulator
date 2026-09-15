/**
 * Shared report data loader.
 *
 * Loads everything needed to render a participant's full performance report
 * for a given simulation run. Used by both the participant-facing report
 * route and the faculty/admin-facing report route.
 *
 * Does NOT enforce auth or role — callers must do that before invoking.
 *
 * Returns a discriminated result. `ok: false` covers a run that does not
 * exist, one that is not yet complete (status must be "completed", which
 * guarantees the executive recommendation was submitted), and one whose
 * final snapshot could not be read. Callers render the matching state; they
 * must never print substitute numbers under a "Final" heading.
 */

import { KPI_DEFINITIONS } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import { loadRunSnapshots } from "@/lib/simulation/loadRunSnapshots";
import { resolveRunProfile } from "@/lib/simulation/resolveRunProfile";
import type {
  KPIValues,
  ScoreValues,
  KPIKey,
  PerformanceProfile,
} from "@/engine/types";

// ─── Built-once content lookups ──────────────────────────────────────────────

const OPTION_LABEL_MAP = new Map<string, string>();
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

const PROFILE_MAP = new Map(PERFORMANCE_PROFILES.map((p) => [p.key, p]));

// ─── Self-assessment question metadata ──────────────────────────────────────

export const SA_QUESTIONS = [
  {
    key: "sa_q1",
    label: "Confidence in high-stakes financial decisions",
    type: "rating" as const,
  },
  {
    key: "sa_q2",
    label: "Experience with talent and leadership challenges",
    type: "rating" as const,
  },
  {
    key: "sa_q3",
    label: "Familiarity with regulatory and compliance environments",
    type: "rating" as const,
  },
  {
    key: "sa_q4",
    label: "Primary leadership concern at start of simulation",
    type: "text" as const,
  },
];

export const SA_RATING_LABELS: Record<string, string> = {
  "1": "Minimal",
  "2": "Some",
  "3": "Moderate",
  "4": "Strong",
  "5": "Expert",
};

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReportDecisionEntry {
  roundNumber: number;
  templateKey: string;
  templateTitle: string;
  decisionType: string;
  optionLabels: string[];
  allocationLines: string[];
  rationale: string | null;
}

export interface ReportData {
  runId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  participant: {
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  };
  cohort: {
    id: string;
    name: string;
  } | null;
  baselineKPIs: KPIValues;
  finalKPIs: KPIValues;
  finalScores: ScoreValues;
  kpiTrajectory: Array<{ label: string; values: KPIValues }>;
  profile: PerformanceProfile | null;
  decisionsByRound: Map<number, ReportDecisionEntry[]>;
  recommendation: {
    prioritizedStrategy: string | null;
    actionPlan90Day: string | null;
    keyRisks: string | null;
    talentImplications: string | null;
    communicationApproach: string | null;
  } | null;
  selfAssessment: Record<string, string>;
}

/**
 * Why a report could not be produced. `final_data_unavailable` means the run
 * exists and is complete but its final snapshot could not be read; callers
 * must render an explicit unavailable state rather than printing substitute
 * numbers under a "Final" heading.
 */
export type ReportUnavailableReason =
  | "not_found"
  | "incomplete"
  | "final_data_unavailable";

export type LoadReportDataResult =
  | { ok: true; data: ReportData }
  | { ok: false; reason: ReportUnavailableReason };

// ─── Loader ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

interface LoadOptions {
  /**
   * If provided, the run's user_id must match — used by participant-facing
   * route. Faculty/admin route should leave this undefined and verify
   * cohort membership separately.
   */
  requireUserId?: string;
}

export async function loadReportData(
  supabase: SupabaseLike,
  runId: string,
  options: LoadOptions = {}
): Promise<LoadReportDataResult> {
  // ── Load run + participant ──────────────────────────────────────────────

  let runQuery = supabase
    .from("simulation_runs")
    .select(
      "id, status, user_id, cohort_id, scenario_version_id, final_profile_id, self_assessment_json, completed_at, started_at"
    )
    .eq("id", runId);

  if (options.requireUserId) {
    runQuery = runQuery.eq("user_id", options.requireUserId);
  }

  const { data: run } = await runQuery.maybeSingle();
  if (!run) return { ok: false, reason: "not_found" };

  // Report only available after the simulation is fully complete
  // (executive recommendation submitted)
  if (run.status !== "completed") return { ok: false, reason: "incomplete" };

  const [participantRes, cohortRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("id", run.user_id)
      .maybeSingle(),
    supabase
      .from("cohorts")
      .select("id, name")
      .eq("id", run.cohort_id)
      .maybeSingle(),
  ]);

  const participantUser = participantRes.data;
  if (!participantUser) return { ok: false, reason: "not_found" };

  // ── Load scenario rounds ─────────────────────────────────────────────────

  const { data: scenarioRounds } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .order("round_number");

  const roundIdToNumber = new Map(
    (scenarioRounds ?? []).map((r: { id: string; round_number: number }) => [
      r.id,
      r.round_number,
    ])
  );

  // ── Parallel load: snapshots, decisions, recommendation ──────────────────

  const [
    snapshots,
    decisionResponsesRes,
    templateRowsRes,
    recommendationRes,
  ] = await Promise.all([
    // Shared snapshot loader: the printed report must show the same "final"
    // numbers as /results and /dashboard, and must not fall back to the
    // baseline when the round-3 snapshot is missing.
    loadRunSnapshots(supabase, run.id, run.scenario_version_id),
    supabase
      .from("decision_responses")
      .select(
        "decision_template_id, scenario_round_id, selected_option_ids_json, allocation_json, short_rationale_text"
      )
      .eq("simulation_run_id", run.id)
      .order("responded_at"),
    supabase
      .from("decision_templates")
      .select("id, key")
      .in(
        "scenario_round_id",
        (scenarioRounds ?? []).map((r: { id: string }) => r.id)
      ),
    supabase
      .from("executive_recommendations")
      .select(
        "prioritized_strategy, action_plan_90_day, key_risks, talent_implications, communication_approach"
      )
      .eq("simulation_run_id", run.id)
      .maybeSingle(),
  ]);

  if (!snapshots.ok) {
    console.error(
      `loadReportData: final data unavailable for run ${run.id} (${snapshots.reason})`
    );
    return { ok: false, reason: "final_data_unavailable" };
  }

  // ── Build KPI values ─────────────────────────────────────────────────────

  const baselineKPIs: KPIValues = snapshots.baseline;
  const finalKPIs: KPIValues = snapshots.final;
  const finalScores: ScoreValues = snapshots.finalScores;

  const kpiTrajectory = [
    { label: "Baseline", values: baselineKPIs },
    ...(snapshots.r1 ? [{ label: "Round 1", values: snapshots.r1 }] : []),
    ...(snapshots.r2 ? [{ label: "Round 2", values: snapshots.r2 }] : []),
    { label: "Round 3", values: finalKPIs },
  ];

  // ── Profile resolution ───────────────────────────────────────────────────
  // Assign-or-read through the shared helper. Reading final_profile_id alone
  // left the printed report blank for any run whose profile had never been
  // assigned, while /results showed one.

  const assignedProfileKey = await resolveRunProfile(supabase, run, {
    finalKPIs,
    finalScores,
    finalScoresAvailable: snapshots.finalScoresAvailable,
  });

  const profile: PerformanceProfile | null = assignedProfileKey
    ? (PROFILE_MAP.get(assignedProfileKey) ?? null)
    : null;

  // ── Decision summary ─────────────────────────────────────────────────────

  const templateIdToKey = new Map<string, string>(
    (templateRowsRes.data ?? []).map(
      (t: { id: string; key: string }) => [t.id, t.key] as [string, string]
    )
  );

  const decisionEntries: ReportDecisionEntry[] = (
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
        (roundIdToNumber.get(resp.scenario_round_id) as number | undefined) ??
        0;

      const optionLabels = resp.selected_option_ids_json.map(
        (k) => OPTION_LABEL_MAP.get(k) ?? k
      );

      const allocationLines = resp.allocation_json
        ? Object.entries(resp.allocation_json)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([key, pct]) =>
                `${OPTION_LABEL_MAP.get(key) ?? key}: ${pct}%`
            )
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

  // Sort decisions within each round by sortOrder from content
  const decisionsByRound = new Map<number, ReportDecisionEntry[]>();
  for (const entry of decisionEntries) {
    const list = decisionsByRound.get(entry.roundNumber) ?? [];
    list.push(entry);
    decisionsByRound.set(entry.roundNumber, list);
  }
  decisionsByRound.forEach((list, roundNum) => {
    const roundContent = IRON_HORIZON_VERSION.rounds.find(
      (r) => r.roundNumber === roundNum
    );
    if (roundContent) {
      const orderMap = new Map<string, number>(
        roundContent.decisions.map(
          (d, i) => [d.key, d.sortOrder ?? i] as [string, number]
        )
      );
      list.sort(
        (a, b) =>
          (orderMap.get(a.templateKey) ?? 99) -
          (orderMap.get(b.templateKey) ?? 99)
      );
    }
  });

  // ── Build participant display name ───────────────────────────────────────

  const firstName = participantUser.first_name ?? "";
  const lastName = participantUser.last_name ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || participantUser.email;

  const data: ReportData = {
    runId: run.id,
    status: run.status,
    startedAt: run.started_at ?? null,
    completedAt: run.completed_at ?? null,
    participant: {
      firstName,
      lastName,
      email: participantUser.email,
      fullName,
    },
    cohort: cohortRes.data
      ? { id: cohortRes.data.id, name: cohortRes.data.name }
      : null,
    baselineKPIs,
    finalKPIs,
    finalScores,
    kpiTrajectory,
    profile,
    decisionsByRound,
    recommendation: recommendationRes.data
      ? {
          prioritizedStrategy: recommendationRes.data.prioritized_strategy,
          actionPlan90Day: recommendationRes.data.action_plan_90_day,
          keyRisks: recommendationRes.data.key_risks,
          talentImplications: recommendationRes.data.talent_implications,
          communicationApproach: recommendationRes.data.communication_approach,
        }
      : null,
    selfAssessment: (run.self_assessment_json ?? {}) as Record<string, string>,
  };

  return { ok: true, data };
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export const REPORT_KPI_LIST = Object.values(KPI_DEFINITIONS);
export const REPORT_SCORE_LIST = Object.values(SCORING_DIMENSIONS);
export type { KPIKey };
