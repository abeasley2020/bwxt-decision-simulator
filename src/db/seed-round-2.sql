-- ============================================================================
-- BWXT Enterprise Decision Simulator - Round 2 options and effect rules
-- Operation Iron Horizon v1.0
-- ============================================================================
--
-- Apply AFTER src/db/seed.sql, which creates the decision_templates these rows
-- attach to. See that file for the full application order.
--
-- Idempotent: ON CONFLICT (id) DO UPDATE throughout, so re-running reconciles
-- a row that was edited by hand rather than failing or duplicating.
--
-- Deterministic ids:
--   decision_options      60000000-0000-0000-0000-00000000000016-0028
--   decision_effect_rules 70000000-0000-0000-0000-000000000055-090
--
-- Expected row counts: 13 options, 36 effect rules.
--
-- Generated 2026-09-15 from the live production database.
--
-- Previously lived in scripts/seed-round2.sql, the one seed artifact that
-- carried the correct production scenario version UUID. The Round 2 options
-- and rules were also duplicated in src/db/seed.sql. Both copies agreed with
-- production; this file replaces both.
--
-- ============================================================================


-- ─── Decision options ────────────────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order, metadata_json)
VALUES
  ('60000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000005', 'r2_reg_proactive',
   'Engage proactively with the regulator before they escalate',
   'Reach out directly to acknowledge the gap, present a remediation plan, and establish a cooperative posture.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000005', 'r2_reg_internal',
   'Conduct an internal review first, then decide whether to disclose',
   'Commission a rapid internal review before any external communication.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000018', '40000000-0000-0000-0000-000000000005', 'r2_reg_legal',
   'Defer to legal and pause all related operations',
   'Place all affected operations on hold and route all communications through legal counsel.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000006', 'r2_comp_partnership',
   'Accelerate a strategic partnership to close capability gap',
   'Identify and fast-track a partnership that closes the gap the competitor is exploiting.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000006', 'r2_comp_rnd',
   'Double down on internal R&D and differentiation',
   'Redirect investment into accelerated R&D to deepen technical differentiation.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000006', 'r2_comp_hold',
   'Stay the course — competitors often overpromise',
   'Maintain current strategy. Monitor before reacting.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000007', 'r2_tal_promote',
   'Promote a high-potential internal candidate immediately',
   'Move the strongest internal candidate into an expanded role now.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000023', '40000000-0000-0000-0000-000000000007', 'r2_tal_search',
   'Launch an accelerated external search',
   'Engage an executive search firm with a 60-day placement target.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000024', '40000000-0000-0000-0000-000000000007', 'r2_tal_redistribute',
   'Redistribute responsibilities across existing leadership',
   'Realign portfolios across current leadership without adding headcount.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000025', '40000000-0000-0000-0000-000000000007', 'r2_tal_interim',
   'Bring in an interim executive while searching',
   'Engage an interim executive firm to place a senior leader within two weeks.',
   4, NULL),
  ('60000000-0000-0000-0000-000000000026', '40000000-0000-0000-0000-000000000011', 'r2_ops_scope',
   'Temporarily reduce scope on lower-priority programs',
   'Pause lower-urgency work to free capacity for constrained programs.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000027', '40000000-0000-0000-0000-000000000011', 'r2_ops_realloc',
   'Request emergency budget reallocation',
   'Request an emergency budget draw to qualify a backup supplier.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000028', '40000000-0000-0000-0000-000000000011', 'r2_ops_push',
   'Push delivery teams harder and accept short-term burnout risk',
   'Ask teams to absorb the gap through extended hours and compressed timelines.',
   3, NULL)
ON CONFLICT (id) DO UPDATE SET
  decision_template_id = EXCLUDED.decision_template_id,
  key                  = EXCLUDED.key,
  label                = EXCLUDED.label,
  description          = EXCLUDED.description,
  sort_order           = EXCLUDED.sort_order,
  metadata_json        = EXCLUDED.metadata_json;

-- ─── Decision effect rules ───────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value, conditions_json)
VALUES
  -- r2_reg_proactive
  ('70000000-0000-0000-0000-000000000055', '60000000-0000-0000-0000-000000000016', 'kpi', 'safety_compliance_confidence', 12, NULL),
  ('70000000-0000-0000-0000-000000000056', '60000000-0000-0000-0000-000000000016', 'kpi', 'executive_confidence', 6, NULL),
  ('70000000-0000-0000-0000-000000000057', '60000000-0000-0000-0000-000000000016', 'score', 'enterprise_judgment', 4, NULL),
  -- r2_reg_internal
  ('70000000-0000-0000-0000-000000000058', '60000000-0000-0000-0000-000000000017', 'kpi', 'safety_compliance_confidence', 5, NULL),
  ('70000000-0000-0000-0000-000000000059', '60000000-0000-0000-0000-000000000017', 'kpi', 'executive_confidence', 2, NULL),
  ('70000000-0000-0000-0000-000000000060', '60000000-0000-0000-0000-000000000017', 'score', 'enterprise_judgment', 2, NULL),
  -- r2_reg_legal
  ('70000000-0000-0000-0000-000000000061', '60000000-0000-0000-0000-000000000018', 'kpi', 'safety_compliance_confidence', -5, NULL),
  ('70000000-0000-0000-0000-000000000062', '60000000-0000-0000-0000-000000000018', 'kpi', 'decision_velocity', -8, NULL),
  ('70000000-0000-0000-0000-000000000063', '60000000-0000-0000-0000-000000000018', 'score', 'enterprise_judgment', -2, NULL),
  -- r2_comp_partnership
  ('70000000-0000-0000-0000-000000000064', '60000000-0000-0000-0000-000000000019', 'kpi', 'digital_maturity', 8, NULL),
  ('70000000-0000-0000-0000-000000000065', '60000000-0000-0000-0000-000000000019', 'kpi', 'financial_performance_outlook', 5, NULL),
  ('70000000-0000-0000-0000-000000000066', '60000000-0000-0000-0000-000000000019', 'score', 'technology_data_leadership', 4, NULL),
  -- r2_comp_rnd
  ('70000000-0000-0000-0000-000000000067', '60000000-0000-0000-0000-000000000020', 'kpi', 'digital_maturity', 10, NULL),
  ('70000000-0000-0000-0000-000000000068', '60000000-0000-0000-0000-000000000020', 'kpi', 'financial_performance_outlook', -4, NULL),
  ('70000000-0000-0000-0000-000000000069', '60000000-0000-0000-0000-000000000020', 'score', 'technology_data_leadership', 5, NULL),
  -- r2_comp_hold
  ('70000000-0000-0000-0000-000000000070', '60000000-0000-0000-0000-000000000021', 'kpi', 'financial_performance_outlook', 3, NULL),
  ('70000000-0000-0000-0000-000000000071', '60000000-0000-0000-0000-000000000021', 'score', 'enterprise_judgment', -2, NULL),
  -- r2_tal_promote
  ('70000000-0000-0000-0000-000000000072', '60000000-0000-0000-0000-000000000022', 'kpi', 'talent_readiness', 8, NULL),
  ('70000000-0000-0000-0000-000000000073', '60000000-0000-0000-0000-000000000022', 'kpi', 'cross_functional_alignment', 5, NULL),
  ('70000000-0000-0000-0000-000000000074', '60000000-0000-0000-0000-000000000022', 'score', 'talent_leadership', 4, NULL),
  -- r2_tal_search
  ('70000000-0000-0000-0000-000000000075', '60000000-0000-0000-0000-000000000023', 'kpi', 'talent_readiness', 5, NULL),
  ('70000000-0000-0000-0000-000000000076', '60000000-0000-0000-0000-000000000023', 'score', 'talent_leadership', 2, NULL),
  -- r2_tal_redistribute
  ('70000000-0000-0000-0000-000000000077', '60000000-0000-0000-0000-000000000024', 'kpi', 'talent_readiness', 3, NULL),
  ('70000000-0000-0000-0000-000000000078', '60000000-0000-0000-0000-000000000024', 'kpi', 'operational_throughput', -4, NULL),
  ('70000000-0000-0000-0000-000000000079', '60000000-0000-0000-0000-000000000024', 'score', 'talent_leadership', 1, NULL),
  -- r2_tal_interim
  ('70000000-0000-0000-0000-000000000080', '60000000-0000-0000-0000-000000000025', 'kpi', 'talent_readiness', 6, NULL),
  ('70000000-0000-0000-0000-000000000081', '60000000-0000-0000-0000-000000000025', 'score', 'decision_velocity_with_discipline', 3, NULL),
  -- r2_ops_scope
  ('70000000-0000-0000-0000-000000000082', '60000000-0000-0000-0000-000000000026', 'kpi', 'operational_throughput', 6, NULL),
  ('70000000-0000-0000-0000-000000000083', '60000000-0000-0000-0000-000000000026', 'kpi', 'financial_performance_outlook', 3, NULL),
  ('70000000-0000-0000-0000-000000000084', '60000000-0000-0000-0000-000000000026', 'score', 'enterprise_judgment', 2, NULL),
  -- r2_ops_realloc
  ('70000000-0000-0000-0000-000000000085', '60000000-0000-0000-0000-000000000027', 'kpi', 'operational_throughput', 8, NULL),
  ('70000000-0000-0000-0000-000000000086', '60000000-0000-0000-0000-000000000027', 'kpi', 'financial_performance_outlook', -5, NULL),
  ('70000000-0000-0000-0000-000000000087', '60000000-0000-0000-0000-000000000027', 'score', 'financial_strategic_acumen', 3, NULL),
  -- r2_ops_push
  ('70000000-0000-0000-0000-000000000088', '60000000-0000-0000-0000-000000000028', 'kpi', 'operational_throughput', 10, NULL),
  ('70000000-0000-0000-0000-000000000089', '60000000-0000-0000-0000-000000000028', 'kpi', 'talent_readiness', -8, NULL),
  ('70000000-0000-0000-0000-000000000090', '60000000-0000-0000-0000-000000000028', 'score', 'talent_leadership', -3, NULL)
ON CONFLICT (id) DO UPDATE SET
  decision_option_id = EXCLUDED.decision_option_id,
  effect_type        = EXCLUDED.effect_type,
  target_key         = EXCLUDED.target_key,
  effect_value       = EXCLUDED.effect_value,
  conditions_json    = EXCLUDED.conditions_json;
