/**
 * Database Row Types
 *
 * Matches schema.sql column names exactly (snake_case).
 * Used for raw DB query results and Supabase typed queries.
 */

export interface DBUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "participant" | "faculty" | "admin";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBCohort {
  id: string;
  name: string;
  description: string | null;
  academy_start_date: string | null;
  academy_end_date: string | null;
  simulator_deadline: string | null;
  status: "draft" | "active" | "closed";
  scenario_version_id: string;
  created_at: string;
  updated_at: string;
}

export interface DBCohortMembership {
  id: string;
  user_id: string;
  cohort_id: string;
  cohort_role: "participant" | "faculty" | "admin";
  invitation_status: "pending" | "accepted" | "expired";
  invited_at: string | null;
  assigned_at: string | null;
  created_at: string;
}

export interface DBInvitation {
  id: string;
  email: string;
  token: string;
  cohort_id: string;
  user_id: string | null;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
}

export interface DBScenario {
  id: string;
  key: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface DBScenarioVersion {
  id: string;
  scenario_id: string;
  version_label: string;
  is_active: boolean;
  intro_content: string | null;
  outro_content: string | null;
  estimated_duration_minutes: number | null;
  created_at: string;
}

export interface DBScenarioRound {
  id: string;
  scenario_version_id: string;
  round_number: number;
  title: string;
  description: string | null;
  briefing_content: string;
  event_content: string | null;
  sort_order: number;
  created_at: string;
}

export interface DBDecisionTemplate {
  id: string;
  scenario_round_id: string;
  key: string;
  title: string;
  prompt: string;
  decision_type: "multi_select" | "single_select" | "resource_allocation" | "ranking" | "short_text";
  min_choices: number | null;
  max_choices: number | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface DBDecisionOption {
  id: string;
  decision_template_id: string;
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface DBDecisionEffectRule {
  id: string;
  decision_option_id: string;
  effect_type: "kpi" | "score" | "hidden_trait";
  target_key: string;
  effect_value: number;
  conditions_json: Record<string, unknown> | null;
  created_at: string;
}

export interface DBSimulationRun {
  id: string;
  user_id: string;
  cohort_id: string;
  scenario_version_id: string;
  status: "not_started" | "in_progress" | "completed";
  current_round_number: number;
  self_assessment_json: Record<string, unknown> | null;
  total_time_seconds: number;
  final_profile_id: string | null;
  started_at: string | null;
  last_active_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DBDecisionResponse {
  id: string;
  simulation_run_id: string;
  scenario_round_id: string;
  decision_template_id: string;
  selected_option_ids_json: string[];
  short_rationale_text: string | null;
  allocation_json: Record<string, number> | null;
  responded_at: string;
}

export interface DBKPISnapshot {
  id: string;
  simulation_run_id: string;
  scenario_round_id: string | null;
  snapshot_type: "initial" | "post_decision" | "round_end" | "final";
  kpi_values_json: Record<string, number>;
  captured_at: string;
}

export interface DBScoreSnapshot {
  id: string;
  simulation_run_id: string;
  scenario_round_id: string | null;
  snapshot_type: "round_end" | "final";
  score_values_json: Record<string, number>;
  captured_at: string;
}

export interface DBPerformanceProfile {
  id: string;
  key: string;
  label: string;
  description: string | null;
  strengths_text: string | null;
  blind_spots_text: string | null;
}

export interface DBProfileRule {
  id: string;
  performance_profile_id: string;
  rule_logic_json: Record<string, unknown>;
  priority_order: number;
}

export interface DBExecutiveRecommendation {
  id: string;
  simulation_run_id: string;
  prioritized_strategy: string | null;
  action_plan_90_day: string | null;
  key_risks: string | null;
  talent_implications: string | null;
  communication_approach: string | null;
  created_at: string;
  updated_at: string;
}
