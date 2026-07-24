/**
 * Shared report data loader.
 *
 * Loads everything needed to render a participant's full performance report
 * for a given simulation run. Used by both the participant-facing report
 * route and the faculty/admin-facing report route.
 *
 * Does NOT enforce auth or role — callers must do that before invoking.
 *
 * Returns null if the run does not exist or the simulation is not yet
 * complete enough to produce a meaningful report (must have at least
 * status === "completed", which guarantees executive recommendation
 * has been submitted).
 *
 * Throws DataAccessError when a query fails, so a database problem renders an
 * error instead of a report with missing decisions or a blank trajectory.
 */

import { KPI_DEFINITIONS, buildInitialKPIs } from "@/engine/kpi";
import { SCORING_DIMENSIONS } from "@/engine/scoring";
import { PERFORMANCE_PROFILES } from "@/content/iron-horizon/profiles";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import { throwOnQueryError } from "@/lib/errors";
import type {
  KPIValues,
  ScoreValues,
  KPIKey,
  PerformanceProfile,
  PerformanceProfileKey,
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
): Promise<ReportData | null> {
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

  const { data: run, error: runError } = await runQuery.maybeSingle();
  throwOnQueryError("simulation_runs lookup", runError);
  if (!run) return null;

  // Report only available after the simulation is fully complete
  // (executive recommendation submitted)
  if (run.status !== "completed") return null;

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

  throwOnQueryError("users lookup", participantRes.error);
  throwOnQueryError("cohorts lookup", cohortRes.error);

  const participantUser = participantRes.data;
  if (!participantUser) return null;

  // ── Load scenario rounds ─────────────────────────────────────────────────

  const { data: scenarioRounds, error: scenarioRoundsError } = await supabase
    .from("scenario_rounds")
    .select("id, round_number")
    .eq("scenario_version_id", run.scenario_version_id)
    .order("round_number");

  throwOnQueryError("scenario_rounds lookup", scenarioRoundsError);

  const roundIdToNumber = new Map(
    (scenarioRounds ?? []).map((r: { id: string; round_number: number }) => [
      r.id,
      r.round_number,
    ])
  );
  const round3Id = (scenarioRounds ?? []).find(
    (r: { round_number: number }) => r.round_number === 3
  )?.id as string | undefined;

  // ── Parallel load: snapshots, decisions, recommendation, profiles ─────

  const [
    kpiSnapshotsRes,
    scoreSnapshotsRes,
    decisionResponsesRes,
    templateRowsRes,
    recommendationRes,
    dbProfilesRes,
  ] = await Promise.all([
    supabase
      .from("kpi_snapshots")
      .select("snapshot_type, scenario_round_id, kpi_values_json")
      .eq("simulation_run_id", run.id)
      .order("captured_at"),
    round3Id
      ? supabase
          .from("score_snapshots")
          .select("score_values_json")
          .eq("simulation_run_id", run.id)
          .eq("scenario_round_id", round3Id)
          .eq("snapshot_type", "round_end")
          .maybeSingle()
      : Promise.resolve({ data: null }),
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
    supabase.from("performance_profiles").select("id, key"),
  ]);

  throwOnQueryError("kpi_snapshots lookup", kpiSnapshotsRes.error);
  throwOnQueryError("score_snapshots lookup", scoreSnapshotsRes.error);
  throwOnQueryError("decision_responses lookup", decisionResponsesRes.error);
  throwOnQueryError("decision_templates lookup", templateRowsRes.error);
  throwOnQueryError(
    "executive_recommendations lookup",
    recommendationRes.error
  );
  throwOnQueryError("performance_profiles lookup", dbProfilesRes.error);

  // ── Build KPI values ─────────────────────────────────────────────────────

  const allKpiSnapshots: Array<{
    snapshot_type: string;
    scenario_round_id: string | null;
    kpi_values_json: Record<string, number>;
  }> = kpiSnapshotsRes.data ?? [];

  const baselineKPIs = (allKpiSnapshots.find(
    (s) => s.snapshot_type === "initial"
  )?.kpi_values_json ?? buildInitialKPIs()) as KPIValues;

  const finalKpiSnapshot = round3Id
    ? allKpiSnapshots.find(
        (s) =>
          s.snapshot_type === "round_end" && s.scenario_round_id === round3Id
      )
    : null;
  const finalKPIs = (finalKpiSnapshot?.kpi_values_json ?? baselineKPIs) as KPIValues;
  const finalScores = (scoreSnapshotsRes.data?.score_values_json ?? {}) as ScoreValues;

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

  // ── Profile resolution ───────────────────────────────────────────────────

  let assignedProfileKey: string | null = null;
  if (run.final_profile_id) {
    const dbProfiles: Array<{ id: string; key: string }> =
      dbProfilesRes.data ?? [];
    const matched = dbProfiles.find((p) => p.id === run.final_profile_id);
    assignedProfileKey = matched?.key ?? null;
  }
  const profile = assignedProfileKey
    ? (PROFILE_MAP.get(assignedProfileKey as PerformanceProfileKey) ?? null)
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

  return {
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
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export const REPORT_KPI_LIST = Object.values(KPI_DEFINITIONS);
export const REPORT_SCORE_LIST = Object.values(SCORING_DIMENSIONS);
export type { KPIKey };
