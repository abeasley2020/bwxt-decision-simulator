-- ============================================================================
-- Migration 001 - Snapshot uniqueness, and schema drift reconciliation
-- ============================================================================
--
-- Apply this to an ALREADY-DEPLOYED database. A freshly provisioned database
-- built from src/db/schema.sql already contains everything here.
--
-- Idempotent. Safe to re-run.
--
-- Background
-- ----------
-- Production was reconciled against src/db/schema.sql on 2026-09-15 using the
-- PostgREST OpenAPI document. Two gaps were found:
--
--   1. simulation_runs.is_preview exists in production (boolean, not null,
--      default false) but appeared in no schema artifact. schema.sql now
--      declares it; step 1 below is a no-op guard for any environment that
--      was built from the old file.
--
--   2. kpi_snapshots and score_snapshots have NO uniqueness constraint.
--      Every read of them uses .maybeSingle(), which returns an ERROR when
--      more than one row matches, so one duplicate row would permanently
--      break that participant's round baseline, results page and report.
--      Production had zero duplicates when checked (kpi_snapshots 24 rows /
--      24 distinct keys, score_snapshots 16 / 16), so step 3 can be applied
--      directly today. Step 2 is the de-duplication to run first on any
--      environment that has since drifted.


-- ─── Step 1: is_preview ──────────────────────────────────────────────────────

alter table public.simulation_runs
  add column if not exists is_preview boolean not null default false;


-- ─── Step 2: de-duplicate snapshots (run FIRST, before step 3) ───────────────
--
-- Inspect what would be removed:
--
--   select simulation_run_id, scenario_round_id, snapshot_type, count(*)
--     from public.kpi_snapshots
--    group by 1, 2, 3
--   having count(*) > 1;
--
--   select simulation_run_id, scenario_round_id, snapshot_type, count(*)
--     from public.score_snapshots
--    group by 1, 2, 3
--   having count(*) > 1;
--
-- If either returns rows, run the matching delete below. It keeps the most
-- recently captured row in each group (ties broken by id) and removes the
-- rest. `is not distinct from` is used on scenario_round_id so that the
-- null-round 'initial' rows group correctly.
--
-- Both deletes are commented out. Read the select output first, then
-- uncomment and run only what you need.

-- delete from public.kpi_snapshots k
--  where exists (
--    select 1 from public.kpi_snapshots keep
--     where keep.simulation_run_id = k.simulation_run_id
--       and keep.scenario_round_id is not distinct from k.scenario_round_id
--       and keep.snapshot_type     = k.snapshot_type
--       and (keep.captured_at, keep.id) > (k.captured_at, k.id)
--  );

-- delete from public.score_snapshots s
--  where exists (
--    select 1 from public.score_snapshots keep
--     where keep.simulation_run_id = s.simulation_run_id
--       and keep.scenario_round_id is not distinct from s.scenario_round_id
--       and keep.snapshot_type     = s.snapshot_type
--       and (keep.captured_at, keep.id) > (s.captured_at, s.id)
--  );


-- ─── Step 3: the unique indexes ──────────────────────────────────────────────
--
-- Two partial indexes rather than one UNIQUE constraint: 'initial' rows carry
-- a null scenario_round_id, and Postgres treats nulls as distinct inside a
-- unique index, so a plain three-column constraint would not stop a second
-- 'initial' row.

create unique index if not exists uq_kpi_snapshots_run_round_type
  on public.kpi_snapshots (simulation_run_id, scenario_round_id, snapshot_type)
  where scenario_round_id is not null;

create unique index if not exists uq_kpi_snapshots_run_type_no_round
  on public.kpi_snapshots (simulation_run_id, snapshot_type)
  where scenario_round_id is null;

create unique index if not exists uq_score_snapshots_run_round_type
  on public.score_snapshots (simulation_run_id, scenario_round_id, snapshot_type)
  where scenario_round_id is not null;

create unique index if not exists uq_score_snapshots_run_type_no_round
  on public.score_snapshots (simulation_run_id, snapshot_type)
  where scenario_round_id is null;


-- ─── Verify ──────────────────────────────────────────────────────────────────
--
--   select indexname, indexdef
--     from pg_indexes
--    where schemaname = 'public'
--      and tablename in ('kpi_snapshots', 'score_snapshots')
--    order by 1;
--
-- Expect the four uq_* indexes above.
--
-- Note the behaviour change this introduces: the round-submit route deletes
-- then re-inserts snapshots on resubmission. That order is still correct under
-- these indexes. A concurrent double-submit that previously produced a silent
-- duplicate will now fail the second insert with a unique violation, which is
-- the desired outcome, but it surfaces to the participant as a 500. If that
-- shows up in logs, the fix is an upsert in the route, not dropping the index.
