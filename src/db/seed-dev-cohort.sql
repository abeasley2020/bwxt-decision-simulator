-- ============================================================================
-- BWXT Enterprise Decision Simulator - Development cohort
-- ============================================================================
--
-- LOCAL AND STAGING ONLY. Do not run this against production.
--
-- This used to live at the bottom of src/db/seed.sql, inserted with
-- status = 'active', guarded by nothing but a comment reading "Remove or
-- replace before deploying to production". An active cohort surfaces in the
-- admin cohort list and the faculty dashboard, so anyone who ran the
-- documented seed procedure against production would have put a fake cohort
-- in front of real users.
--
-- Two changes: it is a separate file that has to be chosen deliberately, and
-- the status is 'draft'. Draft cohorts are filtered out of the faculty views
-- and are clearly labelled in admin, so even a mistaken run is visible and
-- harmless. Cohort status transitions are draft -> active -> closed, enforced
-- in /api/admin/cohorts/[cohortId]/status, so an operator who genuinely wants
-- it active can promote it through the UI.
--
-- Idempotent. Safe to re-run.
--
-- Prerequisite: src/db/seed.sql, which creates the scenario version this
-- resolves against.
--
-- ============================================================================

INSERT INTO cohorts (id, name, description, status, scenario_version_id)
SELECT
  '50000000-0000-0000-0000-000000000001',
  'Development Cohort',
  'Local testing cohort. Not for production use.',
  'draft',
  v.id
FROM scenario_versions v
JOIN scenarios s ON s.id = v.scenario_id
WHERE s.key = 'operation_iron_horizon'
  AND v.version_label = 'v1.0'
ON CONFLICT (id) DO NOTHING;


-- ─── Attaching yourself as a participant ─────────────────────────────────────
--
-- 1. Create your account. There is no self-service signup: sign in at /login
--    with credentials an admin provisioned, or create the auth user in the
--    Supabase dashboard under Authentication > Users.
--
-- 2. Insert the matching public.users row. Note that auth.users.id and
--    public.users.id are allowed to differ; the app resolves by email first,
--    so the email is the value that has to match.
--
--    INSERT INTO users (email, first_name, last_name, role)
--    VALUES ('you@example.com', 'First', 'Last', 'participant')
--    ON CONFLICT (email) DO NOTHING;
--
-- 3. Add the cohort membership.
--
--    INSERT INTO cohort_memberships (user_id, cohort_id, cohort_role, invitation_status)
--    SELECT u.id, '50000000-0000-0000-0000-000000000001', 'participant', 'accepted'
--    FROM users u WHERE u.email = 'you@example.com'
--    ON CONFLICT (user_id, cohort_id) DO NOTHING;
--
-- 4. Promote the cohort to active so it is selectable:
--
--    UPDATE cohorts SET status = 'active'
--    WHERE id = '50000000-0000-0000-0000-000000000001';
--
-- 5. Visit /simulation. A run is created automatically and you land on the
--    orientation page.


-- ─── Removing it ─────────────────────────────────────────────────────────────
--
-- Deleting the cohort cascades into cohort_memberships and simulation_runs,
-- and from there into every decision_responses, kpi_snapshots and
-- score_snapshots row for those runs. Check what you are about to lose first:
--
--   SELECT count(*) FROM simulation_runs
--    WHERE cohort_id = '50000000-0000-0000-0000-000000000001';
--
--   DELETE FROM cohorts WHERE id = '50000000-0000-0000-0000-000000000001';
