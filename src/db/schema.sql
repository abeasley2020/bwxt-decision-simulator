-- BWXT Enterprise Decision Simulator — Database Schema
-- PostgreSQL (Supabase)
-- Mirrors schema-map.md exactly

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── 1. Identity and Cohort Management ───────────────────────────────────────

create table users (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  first_name  text not null,
  last_name   text not null,
  role        text not null check (role in ('participant', 'faculty', 'admin')),
  is_active   boolean not null default true,
  last_login_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table cohorts (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  description          text,
  academy_start_date   date,
  academy_end_date     date,
  simulator_deadline   timestamptz,
  status               text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  scenario_version_id  uuid not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table cohort_memberships (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references users(id) on delete cascade,
  cohort_id          uuid not null references cohorts(id) on delete cascade,
  cohort_role        text not null check (cohort_role in ('participant', 'faculty', 'admin')),
  invitation_status  text not null default 'pending' check (invitation_status in ('pending', 'accepted', 'expired')),
  invited_at         timestamptz,
  assigned_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, cohort_id)
);

create table invitations (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null,
  token       text not null unique,
  cohort_id   uuid not null references cohorts(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ─── 2. Scenario Configuration (Authored Content) ────────────────────────────

create table scenarios (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table scenario_versions (
  id                         uuid primary key default uuid_generate_v4(),
  scenario_id                uuid not null references scenarios(id) on delete cascade,
  version_label              text not null,
  is_active                  boolean not null default false,
  intro_content              text,
  outro_content              text,
  estimated_duration_minutes integer,
  created_at                 timestamptz not null default now(),
  unique (scenario_id, version_label)
);

create table scenario_rounds (
  id                  uuid primary key default uuid_generate_v4(),
  scenario_version_id uuid not null references scenario_versions(id) on delete cascade,
  round_number        integer not null,
  title               text not null,
  description         text,
  briefing_content    text not null,
  event_content       text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  unique (scenario_version_id, round_number)
);

create table decision_templates (
  id                uuid primary key default uuid_generate_v4(),
  scenario_round_id uuid not null references scenario_rounds(id) on delete cascade,
  key               text not null,
  title             text not null,
  prompt            text not null,
  decision_type     text not null check (decision_type in ('multi_select', 'single_select', 'resource_allocation', 'ranking', 'short_text')),
  min_choices       integer,
  max_choices       integer,
  is_required       boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (scenario_round_id, key)
);

create table decision_options (
  id                   uuid primary key default uuid_generate_v4(),
  decision_template_id uuid not null references decision_templates(id) on delete cascade,
  key                  text not null,
  label                text not null,
  description          text,
  sort_order           integer not null default 0,
  metadata_json        jsonb,
  created_at           timestamptz not null default now(),
  unique (decision_template_id, key)
);

create table decision_effect_rules (
  id                 uuid primary key default uuid_generate_v4(),
  decision_option_id uuid not null references decision_options(id) on delete cascade,
  effect_type        text not null check (effect_type in ('kpi', 'score', 'hidden_trait')),
  target_key         text not null,
  effect_value       numeric not null,
  conditions_json    jsonb,
  created_at         timestamptz not null default now()
);

create table kpi_definitions (
  id                  uuid primary key default uuid_generate_v4(),
  key                 text not null unique,
  label               text not null,
  description         text,
  min_value           numeric not null default 0,
  max_value           numeric not null default 100,
  default_start_value numeric not null default 50
);

create table scoring_dimensions (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  label       text not null,
  description text
);

-- ─── 3. Runtime Simulation Data ──────────────────────────────────────────────

create table simulation_runs (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references users(id) on delete cascade,
  cohort_id             uuid not null references cohorts(id) on delete cascade,
  scenario_version_id   uuid not null references scenario_versions(id),
  status                text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  current_round_number  integer not null default 1,
  self_assessment_json  jsonb,
  total_time_seconds    integer not null default 0,
  final_profile_id      uuid references performance_profiles(id) on delete set null,
  started_at            timestamptz,
  last_active_at        timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  unique (user_id, cohort_id)
);

create table decision_responses (
  id                     uuid primary key default uuid_generate_v4(),
  simulation_run_id      uuid not null references simulation_runs(id) on delete cascade,
  scenario_round_id      uuid not null references scenario_rounds(id),
  decision_template_id   uuid not null references decision_templates(id),
  selected_option_ids_json jsonb not null default '[]',
  short_rationale_text   text,
  allocation_json        jsonb,
  responded_at           timestamptz not null default now(),
  unique (simulation_run_id, decision_template_id)
);

create table kpi_snapshots (
  id                uuid primary key default uuid_generate_v4(),
  simulation_run_id uuid not null references simulation_runs(id) on delete cascade,
  scenario_round_id uuid references scenario_rounds(id),
  snapshot_type     text not null check (snapshot_type in ('initial', 'post_decision', 'round_end', 'final')),
  kpi_values_json   jsonb not null,
  captured_at       timestamptz not null default now()
);

create table score_snapshots (
  id                uuid primary key default uuid_generate_v4(),
  simulation_run_id uuid not null references simulation_runs(id) on delete cascade,
  scenario_round_id uuid references scenario_rounds(id),
  snapshot_type     text not null check (snapshot_type in ('round_end', 'final')),
  score_values_json jsonb not null,
  captured_at       timestamptz not null default now()
);

-- ─── 4. Evaluation and Outputs ───────────────────────────────────────────────

create table performance_profiles (
  id              uuid primary key default uuid_generate_v4(),
  key             text not null unique,
  label           text not null,
  description     text,
  strengths_text  text,
  blind_spots_text text
);

create table profile_rules (
  id                    uuid primary key default uuid_generate_v4(),
  performance_profile_id uuid not null references performance_profiles(id) on delete cascade,
  rule_logic_json       jsonb not null,
  priority_order        integer not null default 100
);

create table executive_recommendations (
  id                      uuid primary key default uuid_generate_v4(),
  simulation_run_id       uuid not null unique references simulation_runs(id) on delete cascade,
  prioritized_strategy    text,
  action_plan_90_day      text,
  key_risks               text,
  talent_implications     text,
  communication_approach  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── 5. Analytics (Optional MVP) ─────────────────────────────────────────────

create table cohort_analytics_cache (
  id                      uuid primary key default uuid_generate_v4(),
  cohort_id               uuid not null references cohorts(id) on delete cascade,
  completion_summary_json jsonb,
  score_averages_json     jsonb,
  decision_patterns_json  jsonb,
  kpi_trends_json         jsonb,
  profile_distribution_json jsonb,
  generated_at            timestamptz not null default now(),
  unique (cohort_id)
);

-- ─── 6. Future AI (placeholder — not used in MVP) ────────────────────────────

create table ai_generated_artifacts (
  id                    uuid primary key default uuid_generate_v4(),
  artifact_type         text not null check (artifact_type in ('cohort_summary', 'facilitator_briefing', 'participant_summary', 'writing_feedback')),
  target_type           text not null check (target_type in ('cohort', 'simulation_run', 'executive_recommendation')),
  target_id             uuid not null,
  content_markdown      text,
  model_provider        text,
  model_name            text,
  prompt_version        text,
  generation_mode       text not null default 'manual' check (generation_mode in ('manual', 'automatic')),
  status                text not null default 'pending',
  supersedes_artifact_id uuid references ai_generated_artifacts(id),
  generated_at          timestamptz,
  created_at            timestamptz not null default now()
);

-- ─── Foreign Key Deferred Circular Reference Fix ─────────────────────────────
-- simulation_runs.final_profile_id references performance_profiles
-- performance_profiles is defined before simulation_runs, so this is fine above.

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_cohort_memberships_cohort on cohort_memberships(cohort_id);
create index idx_cohort_memberships_user on cohort_memberships(user_id);
create index idx_simulation_runs_user on simulation_runs(user_id);
create index idx_simulation_runs_cohort on simulation_runs(cohort_id);
create index idx_decision_responses_run on decision_responses(simulation_run_id);
create index idx_kpi_snapshots_run on kpi_snapshots(simulation_run_id);
create index idx_score_snapshots_run on score_snapshots(simulation_run_id);
create index idx_invitations_token on invitations(token);
create index idx_invitations_email on invitations(email);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users
  for each row execute procedure set_updated_at();
create trigger cohorts_updated_at before update on cohorts
  for each row execute procedure set_updated_at();
create trigger executive_recommendations_updated_at before update on executive_recommendations
  for each row execute procedure set_updated_at();
