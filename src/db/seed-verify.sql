-- ============================================================================
-- BWXT Enterprise Decision Simulator - Seed verification
-- ============================================================================
--
-- Run after src/db/seed.sql and the three seed-round-N.sql files.
-- Read-only. Safe to run against production at any time.
--
-- The previous scripts/seed-verify.sql checked Round 1 only, and filtered on
-- scenario_version_id = '20000000-0000-0000-0000-000000000001', a UUID that
-- does not exist in production. Every count it returned was 0 regardless of
-- whether the seed had worked. This version resolves the version by label,
-- the same way the seeds do, and covers all three rounds.
--
-- EXPECTED against a correctly seeded database, matching production as of
-- 2026-09-15:
--
--   scenarios                1
--   scenario_versions        1     (label v1.0)
--   scenario_rounds          3
--   decision_templates      12     R1 4, R2 4, R3 4
--   decision_options        42     R1 15, R2 13, R3 14
--   decision_effect_rules  130     R1 54, R2 36, R3 40
--   performance_profiles     8
--   profile_rules            8
--
-- Anything else means a seed file did not apply cleanly. A decision_templates
-- count of 11 specifically means r3_workforce_comms is missing, which was the
-- state of every committed seed before 2026-09-15.
--
-- ============================================================================

WITH target_version AS (
  SELECT v.id
  FROM scenario_versions v
  JOIN scenarios s ON s.id = v.scenario_id
  WHERE s.key = 'operation_iron_horizon'
    AND v.version_label = 'v1.0'
),
rounds AS (
  SELECT r.id, r.round_number
  FROM scenario_rounds r
  JOIN target_version v ON v.id = r.scenario_version_id
),
templates AS (
  SELECT t.id, t.key, r.round_number
  FROM decision_templates t
  JOIN rounds r ON r.id = t.scenario_round_id
),
options AS (
  SELECT o.id, t.round_number
  FROM decision_options o
  JOIN templates t ON t.id = o.decision_template_id
),
rules AS (
  SELECT e.id, o.round_number
  FROM decision_effect_rules e
  JOIN options o ON o.id = e.decision_option_id
)
SELECT 'scenario_versions'     AS entity, NULL::int AS round_number, count(*) AS actual, 1   AS expected FROM target_version
UNION ALL SELECT 'scenario_rounds',       NULL, count(*), 3   FROM rounds
UNION ALL SELECT 'decision_templates',    NULL, count(*), 12  FROM templates
UNION ALL SELECT 'decision_templates',    1,    count(*), 4   FROM templates WHERE round_number = 1
UNION ALL SELECT 'decision_templates',    2,    count(*), 4   FROM templates WHERE round_number = 2
UNION ALL SELECT 'decision_templates',    3,    count(*), 4   FROM templates WHERE round_number = 3
UNION ALL SELECT 'decision_options',      NULL, count(*), 42  FROM options
UNION ALL SELECT 'decision_options',      1,    count(*), 15  FROM options WHERE round_number = 1
UNION ALL SELECT 'decision_options',      2,    count(*), 13  FROM options WHERE round_number = 2
UNION ALL SELECT 'decision_options',      3,    count(*), 14  FROM options WHERE round_number = 3
UNION ALL SELECT 'decision_effect_rules', NULL, count(*), 130 FROM rules
UNION ALL SELECT 'decision_effect_rules', 1,    count(*), 54  FROM rules WHERE round_number = 1
UNION ALL SELECT 'decision_effect_rules', 2,    count(*), 36  FROM rules WHERE round_number = 2
UNION ALL SELECT 'decision_effect_rules', 3,    count(*), 40  FROM rules WHERE round_number = 3
UNION ALL SELECT 'performance_profiles',  NULL, count(*), 8   FROM performance_profiles
UNION ALL SELECT 'profile_rules',         NULL, count(*), 8   FROM profile_rules
ORDER BY entity, round_number NULLS FIRST;


-- ─── All 12 decision template keys, in order ─────────────────────────────────
--
-- Expected, and these keys are load-bearing: decision_responses references
-- decision_templates by id, and the submit route matches template rows to
-- authored content by key.
--
--   1  r1_prioritization, r1_capital, r1_talent_hoo, r1_communication
--   2  r2_regulatory, r2_competitor, r2_talent_gap, r2_operational_stress
--   3  r3_ai_adoption, r3_ai_governance, r3_modernization, r3_workforce_comms

SELECT r.round_number, t.sort_order, t.key, t.decision_type
FROM decision_templates t
JOIN scenario_rounds r ON r.id = t.scenario_round_id
JOIN scenario_versions v ON v.id = r.scenario_version_id
JOIN scenarios s ON s.id = v.scenario_id
WHERE s.key = 'operation_iron_horizon'
  AND v.version_label = 'v1.0'
ORDER BY r.round_number, t.sort_order;


-- ─── Snapshot invariant ──────────────────────────────────────────────────────
--
-- CLAUDE.md: no 'final' snapshot is ever written; final values are round 3's
-- 'round_end'. Both queries must return zero rows.

SELECT 'kpi_snapshots' AS table_name, snapshot_type, count(*)
FROM kpi_snapshots WHERE snapshot_type IN ('final', 'post_decision')
GROUP BY 1, 2
UNION ALL
SELECT 'score_snapshots', snapshot_type, count(*)
FROM score_snapshots WHERE snapshot_type IN ('final', 'post_decision')
GROUP BY 1, 2;


-- ─── Snapshot duplicates ─────────────────────────────────────────────────────
--
-- Every snapshot read uses .maybeSingle(), which ERRORS on more than one row.
-- Must return zero rows. If it does not, see
-- src/db/migrations/001_snapshot_uniqueness.sql before applying the unique
-- indexes.

SELECT 'kpi_snapshots' AS table_name, simulation_run_id, scenario_round_id, snapshot_type, count(*)
FROM kpi_snapshots GROUP BY 1, 2, 3, 4 HAVING count(*) > 1
UNION ALL
SELECT 'score_snapshots', simulation_run_id, scenario_round_id, snapshot_type, count(*)
FROM score_snapshots GROUP BY 1, 2, 3, 4 HAVING count(*) > 1;
