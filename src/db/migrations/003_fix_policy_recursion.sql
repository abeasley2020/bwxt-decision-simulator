-- ============================================================================
-- 003: Fix infinite recursion in the cohort-scoped RLS policies
-- ============================================================================
--
-- SYMPTOM
--
-- After applying policies.sql, an authenticated user reading cohorts,
-- cohort_memberships or simulation_runs got:
--
--   ERROR 42P17: infinite recursion detected in policy for relation
--                "cohort_memberships"
--
-- Verified against production on 2026-09-15: anon was correctly locked out of
-- all nine sensitive tables, the service-role client still read everything,
-- and an authenticated admin could read users, decision_responses, snapshots
-- and all scenario content -- but those three tables failed outright. In the
-- application that surfaces as a 500 on the faculty dashboard, the faculty and
-- admin participant lists, every cohort page, and the participant's own
-- /simulation entry point.
--
-- CAUSE
--
-- Three policies evaluated a subquery against public.cohort_memberships
-- inline:
--
--   cohorts_select             (queries cohort_memberships)
--   cohort_memberships_select  (queries cohort_memberships -- itself)
--   simulation_runs_select     (queries cohort_memberships)
--
-- A subquery inside a policy is itself subject to RLS. The one on
-- cohort_memberships therefore re-invokes cohort_memberships_select, which
-- runs the same subquery again: direct self-recursion. The other two reach it
-- transitively and fail the same way.
--
-- policies.sql already uses the correct pattern everywhere else: a SECURITY
-- DEFINER helper runs as the function owner and is not subject to RLS on its
-- inner query, which breaks the cycle. app_can_view_run() joins
-- cohort_memberships this way and is unaffected. These three policies simply
-- inlined the lookup instead of going through a helper.
--
-- FIX
--
-- Add two SECURITY DEFINER helpers for the cohort-membership lookup and
-- rewrite the three policies to call them. No policy loosens: the same people
-- can read the same rows. Only the evaluation path changes.
--
-- Safe to re-run. Apply in the Supabase SQL editor.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Helper functions
-- ----------------------------------------------------------------------------

-- True when the current user holds a faculty or admin membership in the given
-- cohort. SECURITY DEFINER so the cohort_memberships read inside does not
-- re-enter that table's own policy.
create or replace function public.app_is_cohort_staff(target_cohort uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select target_cohort is not null
     and exists (
       select 1
         from public.cohort_memberships m
        where m.cohort_id = target_cohort
          and m.user_id = public.app_current_user_id()
          and m.cohort_role in ('faculty', 'admin')
     );
$$;

-- True when the current user holds any membership in the given cohort.
create or replace function public.app_is_cohort_member(target_cohort uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select target_cohort is not null
     and exists (
       select 1
         from public.cohort_memberships m
        where m.cohort_id = target_cohort
          and m.user_id = public.app_current_user_id()
     );
$$;

revoke all on function public.app_is_cohort_staff(uuid)  from public, anon;
revoke all on function public.app_is_cohort_member(uuid) from public, anon;

grant execute on function public.app_is_cohort_staff(uuid)  to authenticated;
grant execute on function public.app_is_cohort_member(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Rewrite the three recursive policies
-- ----------------------------------------------------------------------------

-- A participant sees cohorts they belong to. Faculty and admins see all.
drop policy if exists cohorts_select on public.cohorts;
create policy cohorts_select on public.cohorts
  for select to authenticated
  using (
    public.app_is_faculty_or_admin()
    or public.app_is_cohort_member(id)
  );

-- A participant sees their own membership rows. Cohort faculty and admins see
-- every membership in the cohorts they staff. Admins see all.
drop policy if exists cohort_memberships_select on public.cohort_memberships;
create policy cohort_memberships_select on public.cohort_memberships
  for select to authenticated
  using (
    user_id = public.app_current_user_id()
    or public.app_is_admin()
    or public.app_is_cohort_staff(cohort_id)
  );

-- A participant sees their own runs. Cohort faculty see runs in their cohorts.
-- Admins see all.
drop policy if exists simulation_runs_select on public.simulation_runs;
create policy simulation_runs_select on public.simulation_runs
  for select to authenticated
  using (
    user_id = public.app_current_user_id()
    or public.app_is_admin()
    or public.app_is_cohort_staff(cohort_id)
  );


-- ============================================================================
-- VERIFY
-- ============================================================================
--
-- 1. These three must return rows rather than erroring. Run them in the SQL
--    editor, which runs as the table owner and bypasses RLS, so they only
--    prove the policies parse. The real check is step 2.
--
--      select count(*) from public.cohorts;
--      select count(*) from public.cohort_memberships;
--      select count(*) from public.simulation_runs;
--
-- 2. Confirm the three policies now reference the helpers and no longer carry
--    an inline subquery on cohort_memberships:
--
--      select tablename, policyname, qual
--        from pg_policies
--       where schemaname = 'public'
--         and policyname in ('cohorts_select',
--                            'cohort_memberships_select',
--                            'simulation_runs_select');
--
--    Each qual should mention app_is_cohort_staff or app_is_cohort_member and
--    should NOT contain "FROM cohort_memberships".
--
-- 3. Re-run the anon smoke test from the policies.sql header. Every table must
--    still refuse anon. This migration must not have widened anything.
--
-- 4. Sign in to the app as an admin and load the faculty dashboard and a
--    cohort page. Those were the surfaces the recursion broke.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
--
-- Reverting restores the recursion and re-breaks those three tables, so this
-- is only useful if you are rolling policies.sql back wholesale. In that case
-- use the rollback section at the end of policies.sql, then also:
--
--   drop function if exists public.app_is_cohort_staff(uuid);
--   drop function if exists public.app_is_cohort_member(uuid);
--
-- ============================================================================
