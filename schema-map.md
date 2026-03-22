# BWXT Enterprise Decision Simulator — Schema Map

This schema map defines the core data model for the MVP. It is organized into:
1. Identity and cohort management
2. Scenario configuration
3. Runtime simulation data
4. Evaluation and outputs
5. Optional future AI augmentation

The design principle is:
- authored scenario content is separate from participant runtime data
- deterministic simulation data is the source of truth
- outputs and analytics are derived from structured runtime data

---

## 1. Identity and Cohort Management

### users
Represents anyone who can log into the system.

Key attributes:
- email
- first_name
- last_name
- role (`participant` | `faculty` | `admin`)
- is_active
- last_login_at

Relationships:
- many-to-many with `cohorts` via `cohort_memberships`
- one-to-many with `simulation_runs`

Notes:
- one identity object per person
- role is the platform-level role; cohort-specific role can also be stored in membership if needed

---

### cohorts
Represents a specific BWXT Leadership Academy cohort.

Key attributes:
- name
- description
- academy_start_date
- academy_end_date
- simulator_deadline
- status (`draft` | `active` | `closed`)
- scenario_version_id

Relationships:
- one-to-many with `cohort_memberships`
- many-to-many with `users` via `cohort_memberships`
- one-to-many with `simulation_runs`
- many-to-one with `scenario_versions`

Notes:
- a cohort is the operational unit for one academy group
- each cohort points to one scenario version

---

### cohort_memberships
Join table assigning users to cohorts.

Key attributes:
- cohort_role (`participant` | `faculty` | `admin`)
- invitation_status (`pending` | `accepted` | `expired`)
- invited_at
- assigned_at

Relationships:
- many-to-one with `users`
- many-to-one with `cohorts`

Notes:
- supports attaching faculty/admin to multiple cohorts
- supports invite and enrollment tracking

---

### invitations
Supports controlled magic-link access and admin-driven enrollment.

Key attributes:
- email
- token
- status (`pending` | `accepted` | `expired`)
- expires_at

Relationships:
- many-to-one with `cohorts`
- optional many-to-one with `users`

Notes:
- useful for controlled cohort onboarding
- can remain lightweight in MVP

---

## 2. Scenario Configuration (Authored Content)

### scenarios
Represents the scenario family.

Key attributes:
- key
- title
- description

Relationships:
- one-to-many with `scenario_versions`

Example:
- `operation_iron_horizon`

Notes:
- allows one conceptual scenario to evolve across versions

---

### scenario_versions
Represents a runnable version of a scenario.

Key attributes:
- version_label
- is_active
- intro_content
- outro_content
- estimated_duration_minutes

Relationships:
- many-to-one with `scenarios`
- one-to-many with `scenario_rounds`
- one-to-many with `cohorts`
- one-to-many with `simulation_runs`

Notes:
- cohorts should point to a specific scenario_version
- preserves historical integrity if content changes later

---

### scenario_rounds
Represents authored rounds inside a scenario version.

Key attributes:
- round_number
- title
- description
- briefing_content
- event_content
- sort_order

Relationships:
- many-to-one with `scenario_versions`
- one-to-many with `decision_templates`

Notes:
- authored round template only
- participant current position is tracked on `simulation_runs`

---

### decision_templates
Represents an authored decision prompt.

Key attributes:
- key
- title
- prompt
- decision_type (`multi_select` | `single_select` | `resource_allocation` | `ranking` | `short_text`)
- min_choices
- max_choices
- is_required
- sort_order

Relationships:
- many-to-one with `scenario_rounds`
- one-to-many with `decision_options`
- one-to-many with `decision_responses`

Notes:
- defines the structure of the decision
- not participant data

---

### decision_options
Represents the selectable options under a decision template.

Key attributes:
- key
- label
- description
- sort_order
- metadata_json

Relationships:
- many-to-one with `decision_templates`
- one-to-many with `decision_effect_rules`

Notes:
- metadata can include tags, allocation hints, cost info, etc.

---

### decision_effect_rules
Represents deterministic rule effects driven by a selected decision option.

Key attributes:
- effect_type (`kpi` | `score` | `hidden_trait`)
- target_key
- effect_value
- conditions_json

Relationships:
- many-to-one with `decision_options`

Notes:
- this is the basis of consequence modeling
- same inputs should always produce same outputs

---

### kpi_definitions
Reference table for tracked KPIs.

Key attributes:
- key
- label
- description
- min_value
- max_value
- default_start_value

Relationships:
- referenced by `kpi_snapshots`
- referenced by simulation rules

Expected KPI keys:
- `decision_velocity`
- `safety_compliance_confidence`
- `financial_performance_outlook`
- `operational_throughput`
- `talent_readiness`
- `digital_maturity`
- `cross_functional_alignment`
- `executive_confidence`

---

### scoring_dimensions
Reference table for score dimensions.

Key attributes:
- key
- label
- description

Relationships:
- referenced by `score_snapshots`
- referenced by simulation rules

Expected keys:
- `enterprise_judgment`
- `decision_velocity_with_discipline`
- `financial_strategic_acumen`
- `technology_data_leadership`
- `talent_leadership`
- `communication_alignment`
- `continuous_improvement_orientation`

---

## 3. Runtime Simulation Data

### simulation_runs
Represents one participant’s journey through one scenario version for one cohort.

Key attributes:
- status (`not_started` | `in_progress` | `completed`)
- current_round_number
- self_assessment_json
- total_time_seconds
- started_at
- last_active_at
- completed_at
- final_profile_id

Relationships:
- many-to-one with `users`
- many-to-one with `cohorts`
- many-to-one with `scenario_versions`
- one-to-many with `decision_responses`
- one-to-many with `kpi_snapshots`
- one-to-many with `score_snapshots`
- one-to-one with `executive_recommendations`
- many-to-one with `performance_profiles`

Notes:
- this is the main runtime state record
- pause/resume depends on this table

---

### decision_responses
Represents a participant’s actual choice for a decision prompt.

Key attributes:
- selected_option_ids_json
- short_rationale_text
- allocation_json
- responded_at

Relationships:
- many-to-one with `simulation_runs`
- many-to-one with `scenario_rounds`
- many-to-one with `decision_templates`

Notes:
- participant runtime data
- separate from authored decision structure

---

### kpi_snapshots
Represents KPI state over time.

Key attributes:
- snapshot_type (`initial` | `post_decision` | `round_end` | `final`)
- kpi_values_json
- captured_at

Relationships:
- many-to-one with `simulation_runs`
- optional many-to-one with `scenario_rounds`

Notes:
- KPIs should be tracked over time, not just final state
- supports consequence visibility and faculty analysis

---

### score_snapshots
Represents score state over time.

Key attributes:
- snapshot_type (`round_end` | `final`)
- score_values_json
- captured_at

Relationships:
- many-to-one with `simulation_runs`
- optional many-to-one with `scenario_rounds`

Notes:
- supports evaluation logic and final profile assignment
- can be final-only in MVP if needed, but round-level is preferable

---

## 4. Evaluation and Outputs

### performance_profiles
Represents predefined leadership archetypes / end-state profiles.

Key attributes:
- key
- label
- description
- strengths_text
- blind_spots_text

Relationships:
- one-to-many with `profile_rules`
- one-to-many with `simulation_runs`

Expected keys:
- `enterprise_catalyst`
- `disciplined_accelerator`
- `functional_optimizer`
- `cautious_operator`
- `innovation_without_guardrails`
- `talent_blind_spot`
- `strategic_communicator`
- `data_enabled_builder`

Notes:
- archetypes are predefined
- assignment is dynamic

---

### profile_rules
Represents deterministic mapping logic from score patterns / traits to a performance profile.

Key attributes:
- rule_logic_json
- priority_order

Relationships:
- many-to-one with `performance_profiles`

Notes:
- allows profile assignment without hardcoding direct path mappings
- higher priority rules can resolve collisions

---

### executive_recommendations
Represents the participant’s final structured executive output.

Key attributes:
- prioritized_strategy
- action_plan_90_day
- key_risks
- talent_implications
- communication_approach

Relationships:
- one-to-one with `simulation_runs`

Notes:
- should remain participant-authored source data
- useful for faculty review and exports

---

## 5. Analytics / Reporting

### cohort_analytics_cache (optional for MVP)
Stores precomputed analytics for faster faculty dashboard rendering.

Key attributes:
- completion_summary_json
- score_averages_json
- decision_patterns_json
- kpi_trends_json
- profile_distribution_json
- generated_at

Relationships:
- many-to-one with `cohorts`

Notes:
- optional in MVP
- live queries may be sufficient initially
- can be added if dashboard performance becomes an issue

---

### export_jobs (optional)
Tracks requested exports.

Key attributes:
- export_type (`participant_pdf` | `cohort_pdf` | `csv`)
- status
- file_url
- created_at
- completed_at

Relationships:
- many-to-one with `cohorts`
- optional many-to-one with `users`

Notes:
- useful if export generation becomes asynchronous

---

## 6. Optional Future AI Augmentation

These are NOT required for MVP core logic.

### ai_generated_artifacts (future)
Stores AI-generated summaries and facilitator content.

Key attributes:
- artifact_type (`cohort_summary` | `facilitator_briefing` | `participant_summary` | `writing_feedback`)
- target_type (`cohort` | `simulation_run` | `executive_recommendation`)
- target_id
- content_json or content_markdown
- model_provider
- model_name
- prompt_version
- generation_mode (`manual` | `automatic`)
- status
- generated_at
- supersedes_artifact_id

Relationships:
- linked logically to `cohorts`, `simulation_runs`, or `executive_recommendations`

Notes:
- AI should generate derived artifacts only
- should not overwrite core source data
- outputs should be versioned and auditable

---

## Relationship Summary

- `users` ↔ `cohorts` = many-to-many via `cohort_memberships`
- `cohorts` → `scenario_versions` = many-to-one
- `scenarios` → `scenario_versions` = one-to-many
- `scenario_versions` → `scenario_rounds` = one-to-many
- `scenario_rounds` → `decision_templates` = one-to-many
- `decision_templates` → `decision_options` = one-to-many
- `decision_options` → `decision_effect_rules` = one-to-many
- `simulation_runs` → `users` = many-to-one
- `simulation_runs` → `cohorts` = many-to-one
- `simulation_runs` → `scenario_versions` = many-to-one
- `simulation_runs` → `decision_responses` = one-to-many
- `simulation_runs` → `kpi_snapshots` = one-to-many
- `simulation_runs` → `score_snapshots` = one-to-many
- `simulation_runs` → `executive_recommendations` = one-to-one
- `simulation_runs` → `performance_profiles` = many-to-one
- `performance_profiles` → `profile_rules` = one-to-many

---

## Naming Guidance

Use these distinctions consistently:

### Authored Content
- `Scenario`
- `ScenarioVersion`
- `ScenarioRound`
- `DecisionTemplate`
- `DecisionOption`

### Runtime Participant Data
- `SimulationRun`
- `DecisionResponse`
- `KPISnapshot`
- `ScoreSnapshot`

### Outputs
- `ExecutiveRecommendation`
- `PerformanceProfile`

This separation is critical for maintainability and future extensibility.

---

## MVP Design Notes

- Keep the schema normalized where it matters
- Use JSON fields where flexibility is helpful:
  - `self_assessment_json`
  - `selected_option_ids_json`
  - `allocation_json`
  - `kpi_values_json`
  - `score_values_json`
  - `rule_logic_json`
  - `metadata_json`
- Do not hardcode authored scenario content into React components
- Do not store KPI/score logic in the frontend
- Keep deterministic engine outputs as the source of truth