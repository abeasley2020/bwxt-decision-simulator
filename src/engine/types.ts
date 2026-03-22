/**
 * Simulation Engine Types
 *
 * These types mirror the schema-map.md data model exactly.
 * Authored content types are separated from runtime participant data types.
 * No UI or framework dependencies in this file.
 */

// ─── Decision Types ──────────────────────────────────────────────────────────

export type DecisionType =
  | "multi_select"
  | "single_select"
  | "resource_allocation"
  | "ranking"
  | "short_text";

export type EffectType = "kpi" | "score" | "hidden_trait";

export type SnapshotType = "initial" | "post_decision" | "round_end" | "final";

// ─── KPI Keys ────────────────────────────────────────────────────────────────

export type KPIKey =
  | "decision_velocity"
  | "safety_compliance_confidence"
  | "financial_performance_outlook"
  | "operational_throughput"
  | "talent_readiness"
  | "digital_maturity"
  | "cross_functional_alignment"
  | "executive_confidence";

export type KPIValues = Record<KPIKey, number>;

// ─── Scoring Dimension Keys ───────────────────────────────────────────────────

export type ScoringDimensionKey =
  | "enterprise_judgment"
  | "decision_velocity_with_discipline"
  | "financial_strategic_acumen"
  | "technology_data_leadership"
  | "talent_leadership"
  | "communication_alignment"
  | "continuous_improvement_orientation";

export type ScoreValues = Record<ScoringDimensionKey, number>;

// ─── Performance Profile Keys ─────────────────────────────────────────────────

export type PerformanceProfileKey =
  | "enterprise_catalyst"
  | "disciplined_accelerator"
  | "functional_optimizer"
  | "cautious_operator"
  | "innovation_without_guardrails"
  | "talent_blind_spot"
  | "strategic_communicator"
  | "data_enabled_builder";

// ─── Authored Content Types ───────────────────────────────────────────────────

export interface KPIDefinition {
  key: KPIKey;
  label: string;
  description: string;
  minValue: number;
  maxValue: number;
  defaultStartValue: number;
}

export interface ScoringDimension {
  key: ScoringDimensionKey;
  label: string;
  description: string;
}

export interface DecisionEffectRule {
  effectType: EffectType;
  targetKey: KPIKey | ScoringDimensionKey | string;
  effectValue: number;
  conditionsJson?: Record<string, unknown>;
}

export interface DecisionOption {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  metadataJson?: Record<string, unknown>;
  effectRules: DecisionEffectRule[];
}

export interface DecisionTemplate {
  key: string;
  title: string;
  prompt: string;
  decisionType: DecisionType;
  minChoices?: number;
  maxChoices?: number;
  isRequired: boolean;
  sortOrder: number;
  options: DecisionOption[];
}

export interface ScenarioRound {
  roundNumber: number;
  title: string;
  description: string;
  briefingContent: string;
  eventContent: string;
  sortOrder: number;
  decisions: DecisionTemplate[];
}

export interface ScenarioVersion {
  id: string;
  versionLabel: string;
  introContent: string;
  outroContent: string;
  estimatedDurationMinutes: number;
  rounds: ScenarioRound[];
}

// ─── Runtime Data Types ───────────────────────────────────────────────────────

export interface DecisionResponse {
  simulationRunId: string;
  roundNumber: number;
  decisionKey: string;
  selectedOptionIds: string[];
  shortRationaleText?: string;
  allocationJson?: Record<string, number>;
  respondedAt: string;
}

export interface KPISnapshot {
  simulationRunId: string;
  snapshotType: SnapshotType;
  roundNumber?: number;
  kpiValues: KPIValues;
  capturedAt: string;
}

export interface ScoreSnapshot {
  simulationRunId: string;
  snapshotType: SnapshotType;
  roundNumber?: number;
  scoreValues: ScoreValues;
  capturedAt: string;
}

export type SimulationStatus = "not_started" | "in_progress" | "completed";

export interface SimulationState {
  runId: string;
  userId: string;
  cohortId: string;
  scenarioVersionId: string;
  status: SimulationStatus;
  currentRoundNumber: number;
  selfAssessment?: Record<string, unknown>;
  responses: DecisionResponse[];
  kpiSnapshots: KPISnapshot[];
  scoreSnapshots: ScoreSnapshot[];
  finalProfileKey?: PerformanceProfileKey;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
  totalTimeSeconds: number;
}

// ─── Evaluation Types ─────────────────────────────────────────────────────────

export interface ProfileRule {
  ruleLogicJson: ProfileRuleLogic;
  priorityOrder: number;
}

export interface ProfileRuleLogic {
  // Minimum score thresholds to match this profile
  scoreThresholds?: Partial<Record<ScoringDimensionKey, number>>;
  // KPI thresholds
  kpiThresholds?: Partial<Record<KPIKey, number>>;
  // Hidden trait matches
  requiredTraits?: string[];
  // Dimensions that must be the highest among listed
  dominantDimensions?: ScoringDimensionKey[];
}

export interface PerformanceProfile {
  key: PerformanceProfileKey;
  label: string;
  description: string;
  strengthsText: string;
  blindSpotsText: string;
  rules: ProfileRule[];
}

export interface ExecutiveRecommendation {
  simulationRunId: string;
  prioritizedStrategy: string;
  actionPlan90Day: string;
  keyRisks: string;
  talentImplications: string;
  communicationApproach: string;
}

// ─── Engine Result Types ──────────────────────────────────────────────────────

export interface EffectApplicationResult {
  updatedKPIs: KPIValues;
  updatedScores: ScoreValues;
  acquiredTraits: string[];
}

export interface ProfileAssignmentResult {
  profileKey: PerformanceProfileKey;
  matchedRules: ProfileRule[];
}
