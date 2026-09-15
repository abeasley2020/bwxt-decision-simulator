-- ============================================================================
-- BWXT Enterprise Decision Simulator - Row Level Security
-- ============================================================================
--
-- WHY THIS FILE EXISTS
--
-- Until this file is applied, the public schema has NO row level security.
-- Verified empirically against production on 2026-09-15 using only the public
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, with no session:
--
--   SELECT  returned live rows from users, simulation_runs, decision_responses,
--           kpi_snapshots, score_snapshots, executive_recommendations, cohorts,
--           cohort_memberships, invitations and performance_profiles.
--   UPDATE  (PATCH with a zero-row filter) returned HTTP 200 on users,
--           simulation_runs, decision_responses, executive_recommendations
--           and cohorts.
--   DELETE  returned HTTP 200 on decision_responses.
--
-- The anon key is compiled into the client bundle, so it is readable by any
-- visitor. Net effect before remediation: anyone on the internet can read every
-- participant's name, email, decisions, scores and written executive
-- recommendation, modify any row, escalate their own users.role to 'admin',
-- or delete records.
--
-- This file is the remediation. Apply it in the Supabase SQL editor, top to
-- bottom, in one transaction-safe pass. It is idempotent and safe to re-run.
--
-- The application's own server code calls createAdminClient() (service_role)
-- in six places for faculty and admin cross-user reads. service_role bypasses
-- RLS entirely, so nothing below needs to accommodate it. The policies below
-- exist to protect the anon key and to correctly scope the user-scoped
-- (authenticated) client, which is what every participant mutation runs on.
--
-- ============================================================================
-- HOW TO VERIFY
-- ============================================================================
--
-- BEFORE applying, capture the current state so you can compare afterwards:
--
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--   select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public';
--
-- If the first query already shows rowsecurity = true on some tables, or the
-- second returns policies this file does not create, STOP and diff before
-- applying. This file was written from the application's access patterns, not
-- dumped from a database that already had policies.
--
-- AFTER applying, re-run both queries. Every public table must show
-- rowsecurity = true.
--
-- Then run the anon-key smoke test from a shell. Substitute your project URL
-- and the anon key (NOT the service role key):
--
--   URL=https://<project>.supabase.co
--   ANON=<NEXT_PUBLIC_SUPABASE_ANON_KEY>
--
--   # Every one of these must return [] (empty array), not rows:
--   for t in users simulation_runs decision_responses kpi_snapshots \
--            score_snapshots executive_recommendations cohorts \
--            cohort_memberships invitations; do
--     printf '%-28s ' "$t"
--     curl -s "$URL/rest/v1/$t?select=id&limit=1" \
--       -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--     echo
--   done
--
--   # Anon WRITE must be refused. Before remediation all three of these
--   # returned HTTP 200. Afterwards each must return 401 or 403.
--   #
--   # Use Prefer: return=representation so a 200 that affected nothing is
--   # distinguishable from a 200 that wrote. A refused call returns a JSON
--   # error body; an allowed-but-zero-row call returns [].
--
--   # 1. privilege escalation attempt
--   curl -s -w ' <- %{http_code}\n' \
--     -X PATCH "$URL/rest/v1/users?id=eq.00000000-0000-0000-0000-000000000000" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     -H "Prefer: return=representation" \
--     -H "Content-Type: application/json" -d '{"role":"admin"}'
--
--   # 2. destructive delete. This returned 200 against production on
--   #    2026-09-15, which is why it is called out separately.
--   curl -s -w ' <- %{http_code}\n' \
--     -X DELETE "$URL/rest/v1/decision_responses?id=eq.00000000-0000-0000-0000-000000000000" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     -H "Prefer: return=representation"
--
--   # 3. insert
--   curl -s -w ' <- %{http_code}\n' \
--     -X POST "$URL/rest/v1/cohorts" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     -H "Prefer: return=representation" \
--     -H "Content-Type: application/json" -d '{"name":"smoke-test"}'
--
-- If step 3 ever succeeds, delete the row it created immediately.
--
-- Finally, log in as a real participant with a run in progress and confirm
-- they can still load /simulation, submit a round, and view their results.
-- That path is the one most at risk from a wrong policy.
--
-- ============================================================================
-- THE IDENTITY SPLIT (read this before editing any policy below)
-- ============================================================================
--
-- auth.users.id and public.users.id are NOT the same value for accounts
-- provisioned before the invite-flow fix. Every page and route in this app
-- resolves the public user by email first and falls back to the auth id
-- (see src/lib/auth/resolvePublicUser.ts).
--
-- cohort_memberships.user_id and simulation_runs.user_id are foreign keys to
-- public.users.id. A naive `using (user_id = auth.uid())` policy would lock
-- those legacy participants out of their own in-progress runs.
--
-- Every policy below is therefore written in terms of app_current_user_id(),
-- which performs the same email-first resolution in SQL.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Helper functions
-- ----------------------------------------------------------------------------
--
-- These are SECURITY DEFINER so they can read public.users without being
-- filtered by the very policies that call them (which would recurse). When
-- created from the Supabase SQL editor they are owned by postgres, and a table
-- owner is exempt from RLS unless FORCE ROW LEVEL SECURITY is set. Do not set
-- FORCE ROW LEVEL SECURITY on public.users.
--
-- search_path is pinned, and EXECUTE is revoked from public/anon, so these
-- cannot be used as a privilege escalation primitive by an anonymous caller.

create or replace function public.app_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select u.id from public.users u
      where u.email = (auth.jwt() ->> 'email')
      limit 1),
    (select u.id from public.users u
      where u.id = auth.uid()
      limit 1)
  );
$$;

comment on function public.app_current_user_id() is
  'Resolves the public.users.id for the current JWT, by email first then auth id. Mirrors src/lib/auth/resolvePublicUser.ts. Returns null when unauthenticated or unmatched.';

create or replace function public.app_current_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.role from public.users u
   where u.id = public.app_current_user_id()
   limit 1;
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.app_current_user_role() = 'admin', false);
$$;

create or replace function public.app_is_faculty_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.app_current_user_role() in ('faculty', 'admin'), false);
$$;

-- True when the current user owns the given simulation run.
create or replace function public.app_owns_run(run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.simulation_runs r
     where r.id = run_id
       and r.user_id = public.app_current_user_id()
  );
$$;

-- True when the current user may roll back a half-written round.
--
-- This exists for exactly one caller: the compensating delete in
-- /api/simulation/[runId]/round/[roundNumber]/submit, which runs on the
-- USER-SCOPED client. When a kpi_snapshots or score_snapshots insert fails,
-- that route returns 500 before advancing current_round_number and deletes
-- this round's decision_responses plus any half-written round_end
-- kpi_snapshots row, so the participant can retry. Without a delete policy
-- the compensation fails silently, the orphaned decision_responses rows
-- survive, and the unique (simulation_run_id, decision_template_id)
-- constraint makes that round permanently unsubmittable.
--
-- The obvious abuse case is a participant deleting their own submitted
-- responses to replay a round for a better score. Three conditions close it,
-- and they mirror the guards the submit route already enforces:
--
--   1. The run must belong to the caller.
--   2. The run must still be 'in_progress'. A completed run is frozen, so
--      nobody can go back and rewrite a finished simulation.
--   3. The row's scenario_round must be the run's CURRENT round. Once a round
--      submits successfully current_round_number advances, which puts that
--      round permanently out of reach. The submit route rejects any round
--      number that is not the current one, so there is no path to re-submit a
--      round you could delete, and no path to delete a round you could
--      re-submit.
--
-- Requiring a non-null round id is also what protects the 'initial' KPI
-- baseline snapshot, which carries scenario_round_id = null and must never be
-- deletable by a participant.
create or replace function public.app_can_rollback_round(run_id uuid, round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select round_id is not null
     and exists (
       select 1
         from public.simulation_runs r
         join public.scenario_rounds sr on sr.id = round_id
        where r.id = run_id
          and r.user_id = public.app_current_user_id()
          and r.status = 'in_progress'
          and sr.round_number = r.current_round_number
     );
$$;

-- True when the current user is faculty or admin attached to the same cohort
-- as the given run. Admins are covered separately and broadly; this exists so
-- faculty reads are cohort-scoped rather than global.
create or replace function public.app_can_view_run(run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.app_is_admin()
      or public.app_owns_run(run_id)
      or exists (
        select 1
          from public.simulation_runs r
          join public.cohort_memberships m
            on m.cohort_id = r.cohort_id
         where r.id = run_id
           and m.user_id = public.app_current_user_id()
           and m.cohort_role in ('faculty', 'admin')
      );
$$;

revoke all on function public.app_current_user_id()      from public, anon;
revoke all on function public.app_current_user_role()    from public, anon;
revoke all on function public.app_is_admin()             from public, anon;
revoke all on function public.app_is_faculty_or_admin()  from public, anon;
revoke all on function public.app_owns_run(uuid)         from public, anon;
revoke all on function public.app_can_rollback_round(uuid, uuid) from public, anon;
revoke all on function public.app_can_view_run(uuid)     from public, anon;

grant execute on function public.app_current_user_id()     to authenticated;
grant execute on function public.app_current_user_role()   to authenticated;
grant execute on function public.app_is_admin()            to authenticated;
grant execute on function public.app_is_faculty_or_admin() to authenticated;
grant execute on function public.app_owns_run(uuid)        to authenticated;
grant execute on function public.app_can_rollback_round(uuid, uuid) to authenticated;
grant execute on function public.app_can_view_run(uuid)    to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Enable RLS on every table in the public schema
-- ----------------------------------------------------------------------------
--
-- Enabling RLS with no policy denies everything for anon and authenticated.
-- service_role still bypasses. So the moment this block runs, the hole is
-- closed; section 3 then re-opens exactly what the app needs.

alter table public.users                     enable row level security;
alter table public.scenarios                 enable row level security;
alter table public.scenario_versions         enable row level security;
alter table public.scenario_rounds           enable row level security;
alter table public.decision_templates        enable row level security;
alter table public.decision_options          enable row level security;
alter table public.decision_effect_rules     enable row level security;
alter table public.kpi_definitions           enable row level security;
alter table public.scoring_dimensions        enable row level security;
alter table public.performance_profiles      enable row level security;
alter table public.profile_rules             enable row level security;
alter table public.cohorts                   enable row level security;
alter table public.cohort_memberships        enable row level security;
alter table public.invitations               enable row level security;
alter table public.simulation_runs           enable row level security;
alter table public.decision_responses        enable row level security;
alter table public.kpi_snapshots             enable row level security;
alter table public.score_snapshots           enable row level security;
alter table public.executive_recommendations enable row level security;
alter table public.cohort_analytics_cache    enable row level security;
alter table public.ai_generated_artifacts    enable row level security;


-- ----------------------------------------------------------------------------
-- 3. Remove the anon role's table-level privileges
-- ----------------------------------------------------------------------------
--
-- Belt and braces. Every policy below targets the `authenticated` role only,
-- so anon would already match nothing. Revoking the grants as well means a
-- future policy written without a `to authenticated` clause cannot silently
-- re-expose the data.
--
-- Verified safe: nothing in this app queries PostgREST before a session
-- exists. The login page calls auth.signInWithPassword (GoTrue, not PostgREST)
-- and only queries public.users afterwards, with a session. There is no
-- unauthenticated invitation-acceptance page. /walkthrough is a static file
-- with no database access.

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- The authenticated role keeps its table grants; RLS is what scopes it.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Policies - identity
-- ----------------------------------------------------------------------------

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = public.app_current_user_id()
    or public.app_is_faculty_or_admin()
  );

-- Only admins may change user rows. Crucially this is what stops a participant
-- from escalating their own role: there is no self-update policy.
drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- No insert or delete policy: user provisioning runs through the invite route,
-- which uses the service-role client and bypasses RLS.


-- ----------------------------------------------------------------------------
-- 5. Policies - authored scenario content (read-only to signed-in users)
-- ----------------------------------------------------------------------------
--
-- Seeding these tables is a manual SQL-editor or service-role operation, so
-- they get no insert/update/delete policy at all.

drop policy if exists scenarios_select on public.scenarios;
create policy scenarios_select on public.scenarios
  for select to authenticated using (true);

drop policy if exists scenario_versions_select on public.scenario_versions;
create policy scenario_versions_select on public.scenario_versions
  for select to authenticated using (true);

drop policy if exists scenario_rounds_select on public.scenario_rounds;
create policy scenario_rounds_select on public.scenario_rounds
  for select to authenticated using (true);

drop policy if exists decision_templates_select on public.decision_templates;
create policy decision_templates_select on public.decision_templates
  for select to authenticated using (true);

drop policy if exists decision_options_select on public.decision_options;
create policy decision_options_select on public.decision_options
  for select to authenticated using (true);

-- decision_effect_rules is the scoring key. A participant who can read it can
-- reverse-engineer the optimal path, which defeats the diagnostic.
-- Verified: no code path in src/app or src/lib queries decision_effect_rules
-- or decision_options at all. Scoring runs off the authored content layer
-- (src/content/iron-horizon, imported by the submit route), so restricting
-- this table breaks nothing. Faculty and admin keep read access for
-- facilitation and for any future DB-driven tooling.
drop policy if exists decision_effect_rules_select on public.decision_effect_rules;
create policy decision_effect_rules_select on public.decision_effect_rules
  for select to authenticated
  using (public.app_is_faculty_or_admin());

drop policy if exists kpi_definitions_select on public.kpi_definitions;
create policy kpi_definitions_select on public.kpi_definitions
  for select to authenticated using (true);

drop policy if exists scoring_dimensions_select on public.scoring_dimensions;
create policy scoring_dimensions_select on public.scoring_dimensions
  for select to authenticated using (true);

drop policy if exists performance_profiles_select on public.performance_profiles;
create policy performance_profiles_select on public.performance_profiles
  for select to authenticated using (true);

-- profile_rules is read by resolveRunProfile on the user-scoped client, so
-- participants need select. It reveals thresholds but not option effects.
drop policy if exists profile_rules_select on public.profile_rules;
create policy profile_rules_select on public.profile_rules
  for select to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 6. Policies - cohorts and membership
-- ----------------------------------------------------------------------------

drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts
  for select to authenticated
  using (
    public.app_is_faculty_or_admin()
    or exists (
      select 1 from public.cohort_memberships m
       where m.cohort_id = cohorts.id
         and m.user_id = public.app_current_user_id()
    )
  );

drop policy if exists cohorts_insert_admin on public.cohorts;
create policy cohorts_insert_admin on public.cohorts
  for insert to authenticated
  with check (public.app_is_admin());

drop policy if exists cohorts_update_admin on public.cohorts;
create policy cohorts_update_admin on public.cohorts
  for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- No delete policy. Cohort deletion cascades into participant data; keep it a
-- deliberate service-role or SQL-editor act.

drop policy if exists cohort_memberships_select on public.cohort_memberships;
create policy cohort_memberships_select on public.cohort_memberships
  for select to authenticated
  using (
    user_id = public.app_current_user_id()
    or public.app_is_admin()
    or exists (
      select 1 from public.cohort_memberships f
       where f.cohort_id = cohort_memberships.cohort_id
         and f.user_id = public.app_current_user_id()
         and f.cohort_role in ('faculty', 'admin')
    )
  );

drop policy if exists cohort_memberships_insert_admin on public.cohort_memberships;
create policy cohort_memberships_insert_admin on public.cohort_memberships
  for insert to authenticated
  with check (public.app_is_admin());

drop policy if exists cohort_memberships_update_admin on public.cohort_memberships;
create policy cohort_memberships_update_admin on public.cohort_memberships
  for update to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- /api/admin/cohorts/[cohortId]/members/[userId] DELETE runs on the
-- user-scoped client, so admins need a delete policy here.
drop policy if exists cohort_memberships_delete_admin on public.cohort_memberships;
create policy cohort_memberships_delete_admin on public.cohort_memberships
  for delete to authenticated
  using (public.app_is_admin());

-- invitations carry single-use tokens. Before this file, anon could read them
-- outright. Admin-only, all commands, and never anon.
drop policy if exists invitations_admin_all on public.invitations;
create policy invitations_admin_all on public.invitations
  for all to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());


-- ----------------------------------------------------------------------------
-- 7. Policies - participant runtime data
-- ----------------------------------------------------------------------------

drop policy if exists simulation_runs_select on public.simulation_runs;
create policy simulation_runs_select on public.simulation_runs
  for select to authenticated
  using (
    user_id = public.app_current_user_id()
    or public.app_is_admin()
    or exists (
      select 1 from public.cohort_memberships m
       where m.cohort_id = simulation_runs.cohort_id
         and m.user_id = public.app_current_user_id()
         and m.cohort_role in ('faculty', 'admin')
    )
  );

-- src/app/simulation/page.tsx auto-creates the caller's own run.
drop policy if exists simulation_runs_insert_own on public.simulation_runs;
create policy simulation_runs_insert_own on public.simulation_runs
  for insert to authenticated
  with check (user_id = public.app_current_user_id());

-- Covers /api/simulation/[runId]/begin, .../round/[n]/submit,
-- .../recommendation, and resolveRunProfile persisting final_profile_id.
-- All three resolveRunProfile call sites are participant pages acting on their
-- own run; faculty and admin report pages use the service-role client.
drop policy if exists simulation_runs_update_own on public.simulation_runs;
create policy simulation_runs_update_own on public.simulation_runs
  for update to authenticated
  using (user_id = public.app_current_user_id() or public.app_is_admin())
  with check (user_id = public.app_current_user_id() or public.app_is_admin());

-- No delete policy.

drop policy if exists decision_responses_select on public.decision_responses;
create policy decision_responses_select on public.decision_responses
  for select to authenticated
  using (public.app_can_view_run(simulation_run_id));

drop policy if exists decision_responses_insert_own on public.decision_responses;
create policy decision_responses_insert_own on public.decision_responses
  for insert to authenticated
  with check (public.app_owns_run(simulation_run_id));

-- Scoped to the compensating rollback only. See app_can_rollback_round().
drop policy if exists decision_responses_delete_own on public.decision_responses;
drop policy if exists decision_responses_delete_rollback on public.decision_responses;
create policy decision_responses_delete_rollback on public.decision_responses
  for delete to authenticated
  using (public.app_can_rollback_round(simulation_run_id, scenario_round_id));

drop policy if exists kpi_snapshots_select on public.kpi_snapshots;
create policy kpi_snapshots_select on public.kpi_snapshots
  for select to authenticated
  using (public.app_can_view_run(simulation_run_id));

drop policy if exists kpi_snapshots_insert_own on public.kpi_snapshots;
create policy kpi_snapshots_insert_own on public.kpi_snapshots
  for insert to authenticated
  with check (public.app_owns_run(simulation_run_id));

-- Same rollback scope. scenario_round_id is null on the 'initial' baseline
-- row, and app_can_rollback_round() returns false for a null round, so the
-- baseline cannot be deleted by a participant.
drop policy if exists kpi_snapshots_delete_own on public.kpi_snapshots;
drop policy if exists kpi_snapshots_delete_rollback on public.kpi_snapshots;
create policy kpi_snapshots_delete_rollback on public.kpi_snapshots
  for delete to authenticated
  using (public.app_can_rollback_round(simulation_run_id, scenario_round_id));

drop policy if exists score_snapshots_select on public.score_snapshots;
create policy score_snapshots_select on public.score_snapshots
  for select to authenticated
  using (public.app_can_view_run(simulation_run_id));

drop policy if exists score_snapshots_insert_own on public.score_snapshots;
create policy score_snapshots_insert_own on public.score_snapshots
  for insert to authenticated
  with check (public.app_owns_run(simulation_run_id));

-- No participant delete policy on score_snapshots. The submit route's
-- compensation touches decision_responses and kpi_snapshots only, so granting
-- delete here would be privilege with no caller. If the compensation is ever
-- widened to drop a half-written score row, add a policy mirroring the
-- kpi_snapshots one above rather than a broad app_owns_run() delete.

drop policy if exists executive_recommendations_select on public.executive_recommendations;
create policy executive_recommendations_select on public.executive_recommendations
  for select to authenticated
  using (public.app_can_view_run(simulation_run_id));

drop policy if exists executive_recommendations_insert_own on public.executive_recommendations;
create policy executive_recommendations_insert_own on public.executive_recommendations
  for insert to authenticated
  with check (public.app_owns_run(simulation_run_id));

drop policy if exists executive_recommendations_update_own on public.executive_recommendations;
create policy executive_recommendations_update_own on public.executive_recommendations
  for update to authenticated
  using (public.app_owns_run(simulation_run_id))
  with check (public.app_owns_run(simulation_run_id));


-- ----------------------------------------------------------------------------
-- 8. Policies - analytics and future AI (not used by the MVP)
-- ----------------------------------------------------------------------------

drop policy if exists cohort_analytics_cache_select on public.cohort_analytics_cache;
create policy cohort_analytics_cache_select on public.cohort_analytics_cache
  for select to authenticated
  using (public.app_is_faculty_or_admin());

drop policy if exists ai_generated_artifacts_admin_all on public.ai_generated_artifacts;
create policy ai_generated_artifacts_admin_all on public.ai_generated_artifacts
  for all to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());


-- ============================================================================
-- ROLLBACK
-- ============================================================================
--
-- A wrong policy locks live participants out mid-simulation. If that happens,
-- run the block below to return the database to its pre-remediation behaviour
-- while you diagnose.
--
-- WARNING: this re-opens the data to the public anon key. It is an emergency
-- measure, not a resting state. Take the site down or rotate the anon key
-- rather than leaving this rolled back overnight.
--
-- A narrower first step, if only ONE table is misbehaving, is to disable RLS
-- on just that table:
--
--     alter table public.<table> disable row level security;
--
-- Full rollback:
--
-- alter table public.users                     disable row level security;
-- alter table public.scenarios                 disable row level security;
-- alter table public.scenario_versions         disable row level security;
-- alter table public.scenario_rounds           disable row level security;
-- alter table public.decision_templates        disable row level security;
-- alter table public.decision_options          disable row level security;
-- alter table public.decision_effect_rules     disable row level security;
-- alter table public.kpi_definitions           disable row level security;
-- alter table public.scoring_dimensions        disable row level security;
-- alter table public.performance_profiles      disable row level security;
-- alter table public.profile_rules             disable row level security;
-- alter table public.cohorts                   disable row level security;
-- alter table public.cohort_memberships        disable row level security;
-- alter table public.invitations               disable row level security;
-- alter table public.simulation_runs           disable row level security;
-- alter table public.decision_responses        disable row level security;
-- alter table public.kpi_snapshots             disable row level security;
-- alter table public.score_snapshots           disable row level security;
-- alter table public.executive_recommendations disable row level security;
-- alter table public.cohort_analytics_cache    disable row level security;
-- alter table public.ai_generated_artifacts    disable row level security;
--
-- -- restore the anon grants this file revoked
-- grant select, insert, update, delete on all tables in schema public to anon;
-- grant usage, select on all sequences in schema public to anon;
-- alter default privileges in schema public grant all on tables    to anon;
-- alter default privileges in schema public grant all on sequences to anon;
--
-- The policies themselves are harmless while RLS is disabled, so they do not
-- need to be dropped. If you do want them gone:
--
--   do $$
--   declare p record;
--   begin
--     for p in select schemaname, tablename, policyname
--                from pg_policies where schemaname = 'public'
--     loop
--       execute format('drop policy if exists %I on %I.%I',
--                      p.policyname, p.schemaname, p.tablename);
--     end loop;
--   end $$;
--
-- ============================================================================
-- FOLLOW-UP, NOT COVERED BY THIS FILE
-- ============================================================================
--
-- 1. Rotate NEXT_PUBLIC_SUPABASE_ANON_KEY after applying. The current key has
--    been publicly readable in the client bundle while the schema was open,
--    so assume it is compromised.
-- 2. Rotate SUPABASE_SERVICE_ROLE_KEY if it has ever been pasted anywhere
--    outside .env.local and the Vercel environment.
-- 3. CLAUDE.md states that "RLS on users silently empties embedded joins on
--    the user-scoped client", which is the stated reason six pages use
--    createAdminClient(). That claim does not reproduce today, because there
--    is no RLS to cause it. Once this file is applied, re-test those six pages
--    and decide whether the service-role client is still needed. The policies
--    above deliberately let faculty and admin read the rows those pages join,
--    so it may not be.
-- ============================================================================
