-- ============================================================================
-- Migration 002 - Tighten snapshot_type to the invariant the app actually keeps
-- ============================================================================
--
-- STATUS: PROPOSED, NOT APPLIED. This is a decision for Andre, not a fix to
-- run blind. Read the whole file before executing anything.
--
-- What it does
-- ------------
-- CLAUDE.md documents a hard invariant: "No 'final' snapshot type is ever
-- written; final values are round 3's round_end." The database does not
-- enforce it. Today kpi_snapshots accepts
-- ('initial', 'post_decision', 'round_end', 'final') and score_snapshots
-- accepts ('round_end', 'final'). Nothing stops a future change, or a hand-run
-- SQL statement, from writing a 'final' row that every reader would then
-- ignore, silently.
--
-- Verified against production 2026-09-15:
--   kpi_snapshots    initial 8, post_decision 0, round_end 16, final 0
--   score_snapshots  initial 0, post_decision 0, round_end 16, final 0
--
-- So the tightening is currently a no-op on data. Re-verify before applying:
--
--   select snapshot_type, count(*) from public.kpi_snapshots   group by 1;
--   select snapshot_type, count(*) from public.score_snapshots group by 1;
--
-- If either returns a 'final' or 'post_decision' row, STOP. Something wrote a
-- snapshot type the application cannot read, and that is a bug to investigate
-- before it is constrained away.
--
-- Why it might be risky
-- ---------------------
-- 1. score_snapshots would end up accepting only 'round_end'. That is exactly
--    what the app writes, but it leaves no room for an 'initial' score
--    snapshot should the product ever want a baseline score row. Round N
--    baselines currently come from round N-1's round_end, and round 1's
--    baseline is computed in the engine, so the gap is deliberate.
-- 2. 'post_decision' on kpi_snapshots looks like an abandoned design for
--    per-decision KPI capture. Removing it forecloses that without a
--    conversation.
-- 3. A check constraint rejects the write at the database. If any code path
--    does write one of these types under a condition not exercised in
--    production, this turns a silently-ignored row into a 500.
--
-- Recommendation
-- --------------
-- Apply the kpi_snapshots half (drop 'final', keep 'post_decision') and the
-- score_snapshots half (drop 'final'). That enforces the documented invariant
-- exactly, and leaves the unused-but-plausible 'post_decision' alone. Step 1
-- below does that. Step 2 is the fuller version, left commented.
--
-- Idempotent. Safe to re-run.


-- ─── Step 1 (recommended): drop 'final' only ─────────────────────────────────

alter table public.kpi_snapshots
  drop constraint if exists kpi_snapshots_snapshot_type_check;

alter table public.kpi_snapshots
  add constraint kpi_snapshots_snapshot_type_check
  check (snapshot_type in ('initial', 'post_decision', 'round_end'));

alter table public.score_snapshots
  drop constraint if exists score_snapshots_snapshot_type_check;

alter table public.score_snapshots
  add constraint score_snapshots_snapshot_type_check
  check (snapshot_type in ('round_end'));


-- ─── Step 2 (optional, more aggressive): also drop 'post_decision' ───────────
--
-- alter table public.kpi_snapshots
--   drop constraint if exists kpi_snapshots_snapshot_type_check;
--
-- alter table public.kpi_snapshots
--   add constraint kpi_snapshots_snapshot_type_check
--   check (snapshot_type in ('initial', 'round_end'));


-- ─── Rollback ────────────────────────────────────────────────────────────────
--
-- alter table public.kpi_snapshots
--   drop constraint if exists kpi_snapshots_snapshot_type_check;
-- alter table public.kpi_snapshots
--   add constraint kpi_snapshots_snapshot_type_check
--   check (snapshot_type in ('initial', 'post_decision', 'round_end', 'final'));
--
-- alter table public.score_snapshots
--   drop constraint if exists score_snapshots_snapshot_type_check;
-- alter table public.score_snapshots
--   add constraint score_snapshots_snapshot_type_check
--   check (snapshot_type in ('round_end', 'final'));
--
-- Note: the constraint NAMES above are the PostgreSQL defaults for an inline
-- table-level check. If schema.sql was applied under a different name, run
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.kpi_snapshots'::regclass;
--
-- first and substitute the real name.
