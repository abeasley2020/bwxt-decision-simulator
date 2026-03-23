-- BWXT Enterprise Decision Simulator — Round 1 Seed Data
-- Operation Iron Horizon v1.0 — Round 1: Set Direction
--
-- Safe to run on a database that already has scenarios, scenario_versions,
-- and cohorts seeded.  All inserts are idempotent (ON CONFLICT DO NOTHING).
--
-- ─── UUID Registry ────────────────────────────────────────────────────────────
--
--   Scenario Version:  20000000-0000-0000-0000-000000000001
--   Round 1:           30000000-0000-0000-0000-000000000001
--
--   Decision Templates:
--     r1_prioritization  40000000-0000-0000-0000-000000000001
--     r1_capital         40000000-0000-0000-0000-000000000002
--     r1_talent_hoo      40000000-0000-0000-0000-000000000003
--     r1_communication   40000000-0000-0000-0000-000000000004
--
--   Decision Options (prefix 60):
--     r1_pri_revenue     60000000-0000-0000-0000-000000000001
--     r1_pri_compliance  60000000-0000-0000-0000-000000000002
--     r1_pri_digital     60000000-0000-0000-0000-000000000003
--     r1_pri_talent      60000000-0000-0000-0000-000000000004
--     r1_pri_ops         60000000-0000-0000-0000-000000000005
--     r1_cap_compliance  60000000-0000-0000-0000-000000000006
--     r1_cap_digital     60000000-0000-0000-0000-000000000007
--     r1_cap_talent      60000000-0000-0000-0000-000000000008
--     r1_cap_ops         60000000-0000-0000-0000-000000000009
--     r1_hoo_expand      60000000-0000-0000-0000-000000000010
--     r1_hoo_negotiate   60000000-0000-0000-0000-000000000011
--     r1_hoo_decline     60000000-0000-0000-0000-000000000012
--     r1_comm_direct     60000000-0000-0000-0000-000000000013
--     r1_comm_vision     60000000-0000-0000-0000-000000000014
--     r1_comm_focused    60000000-0000-0000-0000-000000000015
--
--   Effect Rules (prefix 70): 001–054  (sequential per option)


-- ─── 1. Scenario Round 1 ──────────────────────────────────────────────────────

INSERT INTO scenario_rounds (
  id, scenario_version_id, round_number, title, description,
  briefing_content, event_content, sort_order
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  1,
  'Set Direction',
  'Establish your leadership priorities in the first 30 days.',
  'It''s Day 1. You''ve received your first executive briefing.

Key facts:
- Q1 revenue is tracking 6% below plan due to delayed defense contract closeouts
- The Safety & Compliance team has flagged two open non-conformances ahead of the audit
- Digital Transformation Program is requesting an emergency budget increase of $12M
- Your Head of Operations has tendered a conditional resignation — she will stay if given expanded authority

The Board expects a clear direction memo within 72 hours.
You must make four decisions now.',
  'The Board''s Operating Committee has convened an emergency call.
They want to know: What are your top priorities for the next 90 days,
and how are you allocating the available discretionary budget of $20M?',
  1
)
ON CONFLICT (scenario_version_id, round_number) DO NOTHING;


-- ─── 2. Decision Templates — Round 1 ──────────────────────────────────────────

INSERT INTO decision_templates (
  id, scenario_round_id, key, title, prompt,
  decision_type, min_choices, max_choices, is_required, sort_order
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'r1_prioritization',
    '90-Day Priority Focus',
    'Select your top two priorities for the next 90 days. Your choices will shape resource allocation, communication, and operating rhythm across the division.',
    'multi_select', 2, 2, true, 1
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'r1_capital',
    'Discretionary Budget Allocation',
    'You have $20M in discretionary budget to allocate across four areas. Distribute it as you see fit. Your allocation signals what you value and where you are placing your bets.',
    'resource_allocation', null, null, true, 2
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'r1_talent_hoo',
    'Head of Operations: Retention Decision',
    'Your Head of Operations has been with BWXT for 14 years and is operationally irreplaceable in the short term. She''s offered to stay if given expanded authority over capital expenditure decisions. How do you respond?',
    'single_select', null, null, true, 3
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    'r1_communication',
    'First Leadership Communication',
    'You are drafting your first all-hands message to the division''s 3,200 employees. What is the primary tone and content of your opening communication?',
    'single_select', null, null, true, 4
  )
ON CONFLICT (scenario_round_id, key) DO NOTHING;


-- ─── 3. Decision Options ───────────────────────────────────────────────────────

-- ── r1_prioritization (5 options) ────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'r1_pri_revenue',
    'Recover revenue gap',
    'Close the $145M defense contract backlog and restore Q1 run rate. Focus sales and delivery teams on near-term contract closeouts.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'r1_pri_compliance',
    'Resolve compliance risk',
    'Address the two open non-conformances and pre-position for the audit. Assign a senior task force and freeze changes to affected processes.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001',
    'r1_pri_digital',
    'Accelerate digital transformation',
    'Prioritize the lagging DX program by assigning executive sponsorship and clearing blockers. Accept short-term cost to capture long-term capability.',
    3
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000001',
    'r1_pri_talent',
    'Stabilize the leadership team',
    'Immediately address the retention risk with your Head of Operations and the two other at-risk direct reports before any other initiative can succeed.',
    4
  ),
  (
    '60000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000001',
    'r1_pri_ops',
    'Improve operational throughput',
    'Focus on removing production bottlenecks and improving on-time delivery metrics before addressing anything else.',
    5
  )
ON CONFLICT (decision_template_id, key) DO NOTHING;

-- ── r1_capital (4 options) ────────────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order)
VALUES
  (
    '60000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000002',
    'r1_cap_compliance',
    'Safety & Compliance remediation',
    'Audit readiness, non-conformance resolution, and process hardening.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000002',
    'r1_cap_digital',
    'Digital Transformation Program',
    'Accelerate the lagging DX program milestones.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000008',
    '40000000-0000-0000-0000-000000000002',
    'r1_cap_talent',
    'Talent retention and development',
    'Retention packages, succession planning, leadership coaching.',
    3
  ),
  (
    '60000000-0000-0000-0000-000000000009',
    '40000000-0000-0000-0000-000000000002',
    'r1_cap_ops',
    'Operational capacity investment',
    'Equipment, tooling, and capacity upgrades to reduce throughput constraints.',
    4
  )
ON CONFLICT (decision_template_id, key) DO NOTHING;

-- ── r1_talent_hoo (3 options) ─────────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order)
VALUES
  (
    '60000000-0000-0000-0000-000000000010',
    '40000000-0000-0000-0000-000000000003',
    'r1_hoo_expand',
    'Grant expanded authority',
    'Formally expand her scope to include capital expenditure sign-off up to $5M. Retain her and signal trust to the broader leadership team.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000011',
    '40000000-0000-0000-0000-000000000003',
    'r1_hoo_negotiate',
    'Counter-offer with a defined transition path',
    'Offer a 12-month expanded role with a clear path to VP Operations, contingent on audit performance. Retain without creating an immediate governance precedent.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000012',
    '40000000-0000-0000-0000-000000000003',
    'r1_hoo_decline',
    'Decline the condition and begin succession planning',
    'Hold the governance line. Thank her for her service, begin internal succession planning, and start a quiet external search.',
    3
  )
ON CONFLICT (decision_template_id, key) DO NOTHING;

-- ── r1_communication (3 options) ─────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order)
VALUES
  (
    '60000000-0000-0000-0000-000000000013',
    '40000000-0000-0000-0000-000000000004',
    'r1_comm_direct',
    'Transparent and direct about challenges',
    'Name the revenue gap, compliance issues, and talent situation explicitly. Set expectations for accountability and pace. Earn trust through honesty.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000014',
    '40000000-0000-0000-0000-000000000004',
    'r1_comm_vision',
    'Inspiring and vision-forward',
    'Lead with where the division is going, not where it has been. Inspire the team with a bold 3-year vision. Save the hard conversations for direct reports.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000015',
    '40000000-0000-0000-0000-000000000004',
    'r1_comm_focused',
    'Focused only on near-term priorities',
    'Communicate three specific operational priorities only. No vision, no backstory — just what we are doing in the next 90 days and why.',
    3
  )
ON CONFLICT (decision_template_id, key) DO NOTHING;


-- ─── 4. Decision Effect Rules ─────────────────────────────────────────────────
-- effect_type IN ('kpi', 'score', 'hidden_trait')
-- KPI target_keys must match keys defined in src/engine/kpi.ts
-- Score target_keys must match keys defined in src/engine/scoring.ts

-- ── r1_pri_revenue ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'kpi',   'financial_performance_outlook',  8),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'kpi',   'decision_velocity',               5),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'score', 'financial_strategic_acumen',      3),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 'score', 'enterprise_judgment',             2)
ON CONFLICT (id) DO NOTHING;

-- ── r1_pri_compliance ─────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', 'kpi',          'safety_compliance_confidence',  12),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', 'kpi',          'executive_confidence',            5),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000002', 'score',        'enterprise_judgment',             4),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000002', 'hidden_trait', 'compliance_first_leader',         1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_pri_digital ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000003', 'kpi',          'digital_maturity',             10),
  ('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000003', 'score',        'technology_data_leadership',    5),
  ('70000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000003', 'score',        'enterprise_judgment',           1),
  ('70000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000003', 'hidden_trait', 'digital_first_leader',          1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_pri_talent ─────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000004', 'kpi',          'talent_readiness',             10),
  ('70000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000004', 'kpi',          'cross_functional_alignment',    6),
  ('70000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000004', 'score',        'talent_leadership',             5),
  ('70000000-0000-0000-0000-000000000016', '60000000-0000-0000-0000-000000000004', 'hidden_trait', 'people_first_leader',           1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_pri_ops ────────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000005', 'kpi',   'operational_throughput',         9),
  ('70000000-0000-0000-0000-000000000018', '60000000-0000-0000-0000-000000000005', 'kpi',   'financial_performance_outlook',  4),
  ('70000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000005', 'score', 'financial_strategic_acumen',     2)
ON CONFLICT (id) DO NOTHING;

-- ── r1_cap_compliance ─────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000020', '60000000-0000-0000-0000-000000000006', 'kpi',   'safety_compliance_confidence',  15),
  ('70000000-0000-0000-0000-000000000021', '60000000-0000-0000-0000-000000000006', 'score', 'enterprise_judgment',            2)
ON CONFLICT (id) DO NOTHING;

-- ── r1_cap_digital ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000022', '60000000-0000-0000-0000-000000000007', 'kpi',   'digital_maturity',             15),
  ('70000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-000000000007', 'score', 'technology_data_leadership',    3)
ON CONFLICT (id) DO NOTHING;

-- ── r1_cap_talent ─────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000024', '60000000-0000-0000-0000-000000000008', 'kpi',   'talent_readiness',   15),
  ('70000000-0000-0000-0000-000000000025', '60000000-0000-0000-0000-000000000008', 'score', 'talent_leadership',   3)
ON CONFLICT (id) DO NOTHING;

-- ── r1_cap_ops ────────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000026', '60000000-0000-0000-0000-000000000009', 'kpi',   'operational_throughput',      15),
  ('70000000-0000-0000-0000-000000000027', '60000000-0000-0000-0000-000000000009', 'score', 'financial_strategic_acumen',   2)
ON CONFLICT (id) DO NOTHING;

-- ── r1_hoo_expand ─────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000028', '60000000-0000-0000-0000-000000000010', 'kpi',   'talent_readiness',            8),
  ('70000000-0000-0000-0000-000000000029', '60000000-0000-0000-0000-000000000010', 'kpi',   'cross_functional_alignment',  5),
  ('70000000-0000-0000-0000-000000000030', '60000000-0000-0000-0000-000000000010', 'kpi',   'operational_throughput',      6),
  ('70000000-0000-0000-0000-000000000031', '60000000-0000-0000-0000-000000000010', 'score', 'talent_leadership',           4),
  ('70000000-0000-0000-0000-000000000032', '60000000-0000-0000-0000-000000000010', 'score', 'enterprise_judgment',         2)
ON CONFLICT (id) DO NOTHING;

-- ── r1_hoo_negotiate ──────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000033', '60000000-0000-0000-0000-000000000011', 'kpi',          'talent_readiness',                   6),
  ('70000000-0000-0000-0000-000000000034', '60000000-0000-0000-0000-000000000011', 'kpi',          'cross_functional_alignment',          4),
  ('70000000-0000-0000-0000-000000000035', '60000000-0000-0000-0000-000000000011', 'score',        'talent_leadership',                   3),
  ('70000000-0000-0000-0000-000000000036', '60000000-0000-0000-0000-000000000011', 'score',        'decision_velocity_with_discipline',   2),
  ('70000000-0000-0000-0000-000000000037', '60000000-0000-0000-0000-000000000011', 'hidden_trait', 'structured_negotiator',               1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_hoo_decline ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000038', '60000000-0000-0000-0000-000000000012', 'kpi',   'talent_readiness',                   -8),
  ('70000000-0000-0000-0000-000000000039', '60000000-0000-0000-0000-000000000012', 'kpi',   'operational_throughput',             -5),
  ('70000000-0000-0000-0000-000000000040', '60000000-0000-0000-0000-000000000012', 'kpi',   'cross_functional_alignment',         -4),
  ('70000000-0000-0000-0000-000000000041', '60000000-0000-0000-0000-000000000012', 'score', 'enterprise_judgment',                  2),
  ('70000000-0000-0000-0000-000000000042', '60000000-0000-0000-0000-000000000012', 'score', 'decision_velocity_with_discipline',    3)
ON CONFLICT (id) DO NOTHING;

-- ── r1_comm_direct ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000043', '60000000-0000-0000-0000-000000000013', 'kpi',          'cross_functional_alignment',  8),
  ('70000000-0000-0000-0000-000000000044', '60000000-0000-0000-0000-000000000013', 'kpi',          'executive_confidence',         4),
  ('70000000-0000-0000-0000-000000000045', '60000000-0000-0000-0000-000000000013', 'score',        'communication_alignment',      5),
  ('70000000-0000-0000-0000-000000000046', '60000000-0000-0000-0000-000000000013', 'score',        'enterprise_judgment',          2),
  ('70000000-0000-0000-0000-000000000047', '60000000-0000-0000-0000-000000000013', 'hidden_trait', 'transparent_communicator',     1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_comm_vision ────────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000048', '60000000-0000-0000-0000-000000000014', 'kpi',          'cross_functional_alignment',  5),
  ('70000000-0000-0000-0000-000000000049', '60000000-0000-0000-0000-000000000014', 'kpi',          'talent_readiness',             4),
  ('70000000-0000-0000-0000-000000000050', '60000000-0000-0000-0000-000000000014', 'score',        'communication_alignment',      3),
  ('70000000-0000-0000-0000-000000000051', '60000000-0000-0000-0000-000000000014', 'hidden_trait', 'vision_leader',                1)
ON CONFLICT (id) DO NOTHING;

-- ── r1_comm_focused ───────────────────────────────────────────────────────────

INSERT INTO decision_effect_rules (id, decision_option_id, effect_type, target_key, effect_value)
VALUES
  ('70000000-0000-0000-0000-000000000052', '60000000-0000-0000-0000-000000000015', 'kpi',   'decision_velocity',                   5),
  ('70000000-0000-0000-0000-000000000053', '60000000-0000-0000-0000-000000000015', 'score', 'decision_velocity_with_discipline',   3),
  ('70000000-0000-0000-0000-000000000054', '60000000-0000-0000-0000-000000000015', 'score', 'communication_alignment',             1)
ON CONFLICT (id) DO NOTHING;


-- Run scripts/seed-verify.sql to confirm expected row counts.
