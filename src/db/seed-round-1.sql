-- ============================================================================
-- BWXT Enterprise Decision Simulator - Round 1 options and effect rules
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
--   decision_options      60000000-0000-0000-0000-00000000000001-0015
--   decision_effect_rules 70000000-0000-0000-0000-000000000001-054
--
-- Expected row counts: 15 options, 54 effect rules.
--
-- Generated 2026-09-15 from the live production database.
--
-- Previously lived in scripts/seed.sql, which hardcoded the wrong scenario
-- version UUID in its header comment and verification queries. Nothing here
-- references a scenario version: templates are addressed by their own
-- deterministic ids, so this file is version-agnostic.
--
-- ============================================================================


-- ─── Decision options ────────────────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order, metadata_json)
VALUES
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'r1_pri_revenue',
   'Recover revenue gap',
   'Close the $145M defense contract backlog and restore Q1 run rate.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'r1_pri_compliance',
   'Resolve compliance risk',
   'Address the two open non-conformances and pre-position for the audit.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'r1_pri_digital',
   'Accelerate digital transformation',
   'Prioritize the lagging DX program by assigning executive sponsorship and clearing blockers.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'r1_pri_talent',
   'Stabilize the leadership team',
   'Immediately address the retention risk with your Head of Operations and the two other at-risk direct reports.',
   4, NULL),
  ('60000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'r1_pri_ops',
   'Improve operational throughput',
   'Focus on removing production bottlenecks and improving on-time delivery metrics.',
   5, NULL),
  ('60000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', 'r1_cap_compliance',
   'Safety & Compliance remediation',
   'Audit readiness, non-conformance resolution, and process hardening.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000002', 'r1_cap_digital',
   'Digital Transformation Program',
   'Accelerate the lagging DX program milestones.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000002', 'r1_cap_talent',
   'Talent retention and development',
   'Retention packages, succession planning, leadership coaching.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000002', 'r1_cap_ops',
   'Operational capacity investment',
   'Equipment, tooling, and capacity upgrades to reduce throughput constraints.',
   4, NULL),
  ('60000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000003', 'r1_hoo_expand',
   'Grant expanded authority',
   'Formally expand her scope to include capital expenditure sign-off up to $5M.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000003', 'r1_hoo_negotiate',
   'Counter-offer with a defined transition path',
   'Offer a 12-month expanded role with a clear path to VP Operations.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000003', 'r1_hoo_decline',
   'Decline the condition and begin succession planning',
   'Hold the governance line and begin a quiet external search.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000004', 'r1_comm_direct',
   'Transparent and direct about challenges',
   'Name the revenue gap, compliance issues, and talent situation explicitly.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000004', 'r1_comm_vision',
   'Inspiring and vision-forward',
   'Lead with where the division is going, not where it has been.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000004', 'r1_comm_focused',
   'Focused only on near-term priorities',
   'Communicate three specific operational priorities only.',
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
  -- r1_pri_revenue
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'kpi', 'financial_performance_outlook', 8, NULL),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'kpi', 'decision_velocity', 5, NULL),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'score', 'financial_strategic_acumen', 3, NULL),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 'score', 'enterprise_judgment', 2, NULL),
  -- r1_pri_compliance
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', 'kpi', 'safety_compliance_confidence', 12, NULL),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', 'kpi', 'executive_confidence', 5, NULL),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000002', 'score', 'enterprise_judgment', 4, NULL),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000002', 'hidden_trait', 'compliance_first_leader', 1, NULL),
  -- r1_pri_digital
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000003', 'kpi', 'digital_maturity', 10, NULL),
  ('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000003', 'score', 'technology_data_leadership', 5, NULL),
  ('70000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000003', 'score', 'enterprise_judgment', 1, NULL),
  ('70000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000003', 'hidden_trait', 'digital_first_leader', 1, NULL),
  -- r1_pri_talent
  ('70000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000004', 'kpi', 'talent_readiness', 10, NULL),
  ('70000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000004', 'kpi', 'cross_functional_alignment', 6, NULL),
  ('70000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000004', 'score', 'talent_leadership', 5, NULL),
  ('70000000-0000-0000-0000-000000000016', '60000000-0000-0000-0000-000000000004', 'hidden_trait', 'people_first_leader', 1, NULL),
  -- r1_pri_ops
  ('70000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000005', 'kpi', 'operational_throughput', 9, NULL),
  ('70000000-0000-0000-0000-000000000018', '60000000-0000-0000-0000-000000000005', 'kpi', 'financial_performance_outlook', 4, NULL),
  ('70000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000005', 'score', 'financial_strategic_acumen', 2, NULL),
  -- r1_cap_compliance
  ('70000000-0000-0000-0000-000000000020', '60000000-0000-0000-0000-000000000006', 'kpi', 'safety_compliance_confidence', 15, NULL),
  ('70000000-0000-0000-0000-000000000021', '60000000-0000-0000-0000-000000000006', 'score', 'enterprise_judgment', 2, NULL),
  -- r1_cap_digital
  ('70000000-0000-0000-0000-000000000022', '60000000-0000-0000-0000-000000000007', 'kpi', 'digital_maturity', 15, NULL),
  ('70000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-000000000007', 'score', 'technology_data_leadership', 3, NULL),
  -- r1_cap_talent
  ('70000000-0000-0000-0000-000000000024', '60000000-0000-0000-0000-000000000008', 'kpi', 'talent_readiness', 15, NULL),
  ('70000000-0000-0000-0000-000000000025', '60000000-0000-0000-0000-000000000008', 'score', 'talent_leadership', 3, NULL),
  -- r1_cap_ops
  ('70000000-0000-0000-0000-000000000026', '60000000-0000-0000-0000-000000000009', 'kpi', 'operational_throughput', 15, NULL),
  ('70000000-0000-0000-0000-000000000027', '60000000-0000-0000-0000-000000000009', 'score', 'financial_strategic_acumen', 2, NULL),
  -- r1_hoo_expand
  ('70000000-0000-0000-0000-000000000028', '60000000-0000-0000-0000-000000000010', 'kpi', 'talent_readiness', 8, NULL),
  ('70000000-0000-0000-0000-000000000029', '60000000-0000-0000-0000-000000000010', 'kpi', 'cross_functional_alignment', 5, NULL),
  ('70000000-0000-0000-0000-000000000030', '60000000-0000-0000-0000-000000000010', 'kpi', 'operational_throughput', 6, NULL),
  ('70000000-0000-0000-0000-000000000031', '60000000-0000-0000-0000-000000000010', 'score', 'talent_leadership', 4, NULL),
  ('70000000-0000-0000-0000-000000000032', '60000000-0000-0000-0000-000000000010', 'score', 'enterprise_judgment', 2, NULL),
  -- r1_hoo_negotiate
  ('70000000-0000-0000-0000-000000000033', '60000000-0000-0000-0000-000000000011', 'kpi', 'talent_readiness', 6, NULL),
  ('70000000-0000-0000-0000-000000000034', '60000000-0000-0000-0000-000000000011', 'kpi', 'cross_functional_alignment', 4, NULL),
  ('70000000-0000-0000-0000-000000000035', '60000000-0000-0000-0000-000000000011', 'score', 'talent_leadership', 3, NULL),
  ('70000000-0000-0000-0000-000000000036', '60000000-0000-0000-0000-000000000011', 'score', 'decision_velocity_with_discipline', 2, NULL),
  ('70000000-0000-0000-0000-000000000037', '60000000-0000-0000-0000-000000000011', 'hidden_trait', 'structured_negotiator', 1, NULL),
  -- r1_hoo_decline
  ('70000000-0000-0000-0000-000000000038', '60000000-0000-0000-0000-000000000012', 'kpi', 'talent_readiness', -8, NULL),
  ('70000000-0000-0000-0000-000000000039', '60000000-0000-0000-0000-000000000012', 'kpi', 'operational_throughput', -5, NULL),
  ('70000000-0000-0000-0000-000000000040', '60000000-0000-0000-0000-000000000012', 'kpi', 'cross_functional_alignment', -4, NULL),
  ('70000000-0000-0000-0000-000000000041', '60000000-0000-0000-0000-000000000012', 'score', 'enterprise_judgment', 2, NULL),
  ('70000000-0000-0000-0000-000000000042', '60000000-0000-0000-0000-000000000012', 'score', 'decision_velocity_with_discipline', 3, NULL),
  -- r1_comm_direct
  ('70000000-0000-0000-0000-000000000043', '60000000-0000-0000-0000-000000000013', 'kpi', 'cross_functional_alignment', 8, NULL),
  ('70000000-0000-0000-0000-000000000044', '60000000-0000-0000-0000-000000000013', 'kpi', 'executive_confidence', 4, NULL),
  ('70000000-0000-0000-0000-000000000045', '60000000-0000-0000-0000-000000000013', 'score', 'communication_alignment', 5, NULL),
  ('70000000-0000-0000-0000-000000000046', '60000000-0000-0000-0000-000000000013', 'score', 'enterprise_judgment', 2, NULL),
  ('70000000-0000-0000-0000-000000000047', '60000000-0000-0000-0000-000000000013', 'hidden_trait', 'transparent_communicator', 1, NULL),
  -- r1_comm_vision
  ('70000000-0000-0000-0000-000000000048', '60000000-0000-0000-0000-000000000014', 'kpi', 'cross_functional_alignment', 5, NULL),
  ('70000000-0000-0000-0000-000000000049', '60000000-0000-0000-0000-000000000014', 'kpi', 'talent_readiness', 4, NULL),
  ('70000000-0000-0000-0000-000000000050', '60000000-0000-0000-0000-000000000014', 'score', 'communication_alignment', 3, NULL),
  ('70000000-0000-0000-0000-000000000051', '60000000-0000-0000-0000-000000000014', 'hidden_trait', 'vision_leader', 1, NULL),
  -- r1_comm_focused
  ('70000000-0000-0000-0000-000000000052', '60000000-0000-0000-0000-000000000015', 'kpi', 'decision_velocity', 5, NULL),
  ('70000000-0000-0000-0000-000000000053', '60000000-0000-0000-0000-000000000015', 'score', 'decision_velocity_with_discipline', 3, NULL),
  ('70000000-0000-0000-0000-000000000054', '60000000-0000-0000-0000-000000000015', 'score', 'communication_alignment', 1, NULL)
ON CONFLICT (id) DO UPDATE SET
  decision_option_id = EXCLUDED.decision_option_id,
  effect_type        = EXCLUDED.effect_type,
  target_key         = EXCLUDED.target_key,
  effect_value       = EXCLUDED.effect_value,
  conditions_json    = EXCLUDED.conditions_json;
