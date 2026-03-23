-- BWXT Enterprise Decision Simulator — Round 2 Seed (Production)
--
-- Run this in the Supabase SQL Editor against your production instance.
-- Uses CTEs to resolve scenario_round IDs from the live scenario_version UUID.
-- All inserts are idempotent (ON CONFLICT DO NOTHING / DO UPDATE where noted).
--
-- Scenario Version UUID (production): fad1d4c9-a52b-42b2-96da-ff596aef7c86
--
-- Template UUIDs (stable):
--   r2_regulatory:        40000000-0000-0000-0000-000000000005
--   r2_competitor:        40000000-0000-0000-0000-000000000006
--   r2_talent_gap:        40000000-0000-0000-0000-000000000007
--   r2_operational_stress:40000000-0000-0000-0000-000000000011
-- Option UUIDs: 60000000-0000-0000-0000-000000000016 through ...0028
-- Rule UUIDs:   70000000-0000-0000-0000-000000000055 through ...0090

-- ─── Step 1: Update Round 2 scenario_round content ────────────────────────────

UPDATE scenario_rounds
SET
  title           = 'Disruption',
  description     = 'Navigate compounding external and internal shocks at Day 45.',
  briefing_content = 'Three simultaneous disruptions have hit the division. A federal regulator has issued a preliminary inquiry into a safety documentation gap. A well-funded competitor has announced entry into your core defense market. Two direct reports are disengaged. Operational throughput has dropped 8%.',
  event_content   = 'The Board''s Audit Committee chair has called an emergency briefing in 48 hours. You must have a response posture ready across all four disruptions before that call.',
  sort_order      = 2
WHERE
  scenario_version_id = 'fad1d4c9-a52b-42b2-96da-ff596aef7c86'
  AND round_number = 2;

-- ─── Step 2: Upsert Round 2 decision templates ────────────────────────────────

INSERT INTO decision_templates (
  id, scenario_round_id, key, title, prompt,
  decision_type, min_choices, max_choices, is_required, sort_order
)
SELECT
  t.id, r.id, t.key, t.title, t.prompt,
  t.decision_type, t.min_choices, t.max_choices, t.is_required, t.sort_order
FROM (
  VALUES
    (
      '40000000-0000-0000-0000-000000000005'::uuid,
      'r2_regulatory',
      'Regulatory Response',
      'A federal regulator has issued a preliminary inquiry into a safety documentation gap. How do you respond?',
      'single_select'::text, null::integer, null::integer, true, 1
    ),
    (
      '40000000-0000-0000-0000-000000000006'::uuid,
      'r2_competitor',
      'Competitor Threat Response',
      'A well-funded competitor has announced entry into your core defense market. How do you respond?',
      'single_select'::text, null::integer, null::integer, true, 2
    ),
    (
      '40000000-0000-0000-0000-000000000007'::uuid,
      'r2_talent_gap',
      'Talent Gap',
      'Two direct reports are disengaged and a leadership gap has emerged. Select two actions.',
      'multi_select'::text, 2, 2, true, 3
    ),
    (
      '40000000-0000-0000-0000-000000000011'::uuid,
      'r2_operational_stress',
      'Operational Stress Response',
      'Operational throughput has dropped 8% from a supplier delay. How do you respond?',
      'single_select'::text, null::integer, null::integer, true, 4
    )
) AS t(id, key, title, prompt, decision_type, min_choices, max_choices, is_required, sort_order)
JOIN scenario_rounds r
  ON r.scenario_version_id = 'fad1d4c9-a52b-42b2-96da-ff596aef7c86'
 AND r.round_number = 2
ON CONFLICT (id) DO UPDATE
  SET key           = excluded.key,
      title         = excluded.title,
      prompt        = excluded.prompt,
      decision_type = excluded.decision_type,
      min_choices   = excluded.min_choices,
      max_choices   = excluded.max_choices,
      is_required   = excluded.is_required,
      sort_order    = excluded.sort_order;

-- ─── Step 3: Insert Round 2 decision options ──────────────────────────────────

INSERT INTO decision_options (
  id, decision_template_id, key, label, description, sort_order
)
VALUES
  -- r2_regulatory options
  ('60000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000005', 'r2_reg_proactive',
   'Engage proactively with the regulator before they escalate',
   'Reach out directly to the regulatory contact to acknowledge the gap, present a remediation plan, and establish a cooperative posture.',
   1),
  ('60000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000005', 'r2_reg_internal',
   'Conduct an internal review first, then decide whether to disclose',
   'Commission a rapid internal review before any external communication. Reserve disclosure decisions until the facts are clear.',
   2),
  ('60000000-0000-0000-0000-000000000018', '40000000-0000-0000-0000-000000000005', 'r2_reg_legal',
   'Defer to legal and pause all related operations',
   'Place all affected operations on hold and route all communications through legal counsel.',
   3),
  -- r2_competitor options
  ('60000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000006', 'r2_comp_partnership',
   'Accelerate a strategic partnership to close capability gap',
   'Identify and fast-track a manufacturing or technology partnership that closes the gap the competitor is exploiting.',
   1),
  ('60000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000006', 'r2_comp_rnd',
   'Double down on internal R&D and differentiation',
   'Redirect discretionary investment into accelerated R&D to deepen technical differentiation.',
   2),
  ('60000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000006', 'r2_comp_hold',
   'Stay the course — competitors often overpromise',
   'Maintain current strategy. Monitor the competitor''s execution before reacting.',
   3),
  -- r2_talent_gap options
  ('60000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000007', 'r2_tal_promote',
   'Promote a high-potential internal candidate immediately',
   'Identify the strongest internal candidate and move them into an expanded role now.',
   1),
  ('60000000-0000-0000-0000-000000000023', '40000000-0000-0000-0000-000000000007', 'r2_tal_search',
   'Launch an accelerated external search',
   'Engage an executive search firm immediately with a 60-day placement target.',
   2),
  ('60000000-0000-0000-0000-000000000024', '40000000-0000-0000-0000-000000000007', 'r2_tal_redistribute',
   'Redistribute responsibilities across existing leadership',
   'Realign portfolios across the current leadership team to cover the gap without adding headcount.',
   3),
  ('60000000-0000-0000-0000-000000000025', '40000000-0000-0000-0000-000000000007', 'r2_tal_interim',
   'Bring in an interim executive while searching',
   'Engage a specialized interim executive firm to place a senior leader within two weeks.',
   4),
  -- r2_operational_stress options
  ('60000000-0000-0000-0000-000000000026', '40000000-0000-0000-0000-000000000011', 'r2_ops_scope',
   'Temporarily reduce scope on lower-priority programs',
   'Pause or deprioritize lower-urgency work to free capacity for constrained programs.',
   1),
  ('60000000-0000-0000-0000-000000000027', '40000000-0000-0000-0000-000000000011', 'r2_ops_realloc',
   'Request emergency budget reallocation',
   'Request an emergency budget draw to qualify a backup supplier and restore capacity through parallel sourcing.',
   2),
  ('60000000-0000-0000-0000-000000000028', '40000000-0000-0000-0000-000000000011', 'r2_ops_push',
   'Push delivery teams harder and accept short-term burnout risk',
   'Ask delivery teams to absorb the throughput gap through extended hours and compressed timelines.',
   3)
ON CONFLICT (decision_template_id, key) DO NOTHING;

-- ─── Step 4: Insert Round 2 effect rules ──────────────────────────────────────

INSERT INTO decision_effect_rules (
  id, decision_option_id, effect_type, target_key, effect_value
)
VALUES
  -- r2_reg_proactive
  ('70000000-0000-0000-0000-000000000055', '60000000-0000-0000-0000-000000000016', 'kpi',   'safety_compliance_confidence', 12),
  ('70000000-0000-0000-0000-000000000056', '60000000-0000-0000-0000-000000000016', 'kpi',   'executive_confidence',          6),
  ('70000000-0000-0000-0000-000000000057', '60000000-0000-0000-0000-000000000016', 'score', 'enterprise_judgment',           4),
  -- r2_reg_internal
  ('70000000-0000-0000-0000-000000000058', '60000000-0000-0000-0000-000000000017', 'kpi',   'safety_compliance_confidence',  5),
  ('70000000-0000-0000-0000-000000000059', '60000000-0000-0000-0000-000000000017', 'kpi',   'executive_confidence',          2),
  ('70000000-0000-0000-0000-000000000060', '60000000-0000-0000-0000-000000000017', 'score', 'enterprise_judgment',           2),
  -- r2_reg_legal
  ('70000000-0000-0000-0000-000000000061', '60000000-0000-0000-0000-000000000018', 'kpi',   'safety_compliance_confidence', -5),
  ('70000000-0000-0000-0000-000000000062', '60000000-0000-0000-0000-000000000018', 'kpi',   'decision_velocity',            -8),
  ('70000000-0000-0000-0000-000000000063', '60000000-0000-0000-0000-000000000018', 'score', 'enterprise_judgment',          -2),
  -- r2_comp_partnership
  ('70000000-0000-0000-0000-000000000064', '60000000-0000-0000-0000-000000000019', 'kpi',   'digital_maturity',              8),
  ('70000000-0000-0000-0000-000000000065', '60000000-0000-0000-0000-000000000019', 'kpi',   'financial_performance_outlook', 5),
  ('70000000-0000-0000-0000-000000000066', '60000000-0000-0000-0000-000000000019', 'score', 'technology_data_leadership',    4),
  -- r2_comp_rnd
  ('70000000-0000-0000-0000-000000000067', '60000000-0000-0000-0000-000000000020', 'kpi',   'digital_maturity',             10),
  ('70000000-0000-0000-0000-000000000068', '60000000-0000-0000-0000-000000000020', 'kpi',   'financial_performance_outlook', -4),
  ('70000000-0000-0000-0000-000000000069', '60000000-0000-0000-0000-000000000020', 'score', 'technology_data_leadership',    5),
  -- r2_comp_hold
  ('70000000-0000-0000-0000-000000000070', '60000000-0000-0000-0000-000000000021', 'kpi',   'financial_performance_outlook', 3),
  ('70000000-0000-0000-0000-000000000071', '60000000-0000-0000-0000-000000000021', 'score', 'enterprise_judgment',          -2),
  -- r2_tal_promote
  ('70000000-0000-0000-0000-000000000072', '60000000-0000-0000-0000-000000000022', 'kpi',   'talent_readiness',              8),
  ('70000000-0000-0000-0000-000000000073', '60000000-0000-0000-0000-000000000022', 'kpi',   'cross_functional_alignment',    5),
  ('70000000-0000-0000-0000-000000000074', '60000000-0000-0000-0000-000000000022', 'score', 'talent_leadership',             4),
  -- r2_tal_search
  ('70000000-0000-0000-0000-000000000075', '60000000-0000-0000-0000-000000000023', 'kpi',   'talent_readiness',              5),
  ('70000000-0000-0000-0000-000000000076', '60000000-0000-0000-0000-000000000023', 'score', 'talent_leadership',             2),
  -- r2_tal_redistribute
  ('70000000-0000-0000-0000-000000000077', '60000000-0000-0000-0000-000000000024', 'kpi',   'talent_readiness',              3),
  ('70000000-0000-0000-0000-000000000078', '60000000-0000-0000-0000-000000000024', 'kpi',   'operational_throughput',       -4),
  ('70000000-0000-0000-0000-000000000079', '60000000-0000-0000-0000-000000000024', 'score', 'talent_leadership',             1),
  -- r2_tal_interim
  ('70000000-0000-0000-0000-000000000080', '60000000-0000-0000-0000-000000000025', 'kpi',   'talent_readiness',              6),
  ('70000000-0000-0000-0000-000000000081', '60000000-0000-0000-0000-000000000025', 'score', 'decision_velocity_with_discipline', 3),
  -- r2_ops_scope
  ('70000000-0000-0000-0000-000000000082', '60000000-0000-0000-0000-000000000026', 'kpi',   'operational_throughput',        6),
  ('70000000-0000-0000-0000-000000000083', '60000000-0000-0000-0000-000000000026', 'kpi',   'financial_performance_outlook', 3),
  ('70000000-0000-0000-0000-000000000084', '60000000-0000-0000-0000-000000000026', 'score', 'enterprise_judgment',           2),
  -- r2_ops_realloc
  ('70000000-0000-0000-0000-000000000085', '60000000-0000-0000-0000-000000000027', 'kpi',   'operational_throughput',        8),
  ('70000000-0000-0000-0000-000000000086', '60000000-0000-0000-0000-000000000027', 'kpi',   'financial_performance_outlook', -5),
  ('70000000-0000-0000-0000-000000000087', '60000000-0000-0000-0000-000000000027', 'score', 'financial_strategic_acumen',    3),
  -- r2_ops_push
  ('70000000-0000-0000-0000-000000000088', '60000000-0000-0000-0000-000000000028', 'kpi',   'operational_throughput',       10),
  ('70000000-0000-0000-0000-000000000089', '60000000-0000-0000-0000-000000000028', 'kpi',   'talent_readiness',             -8),
  ('70000000-0000-0000-0000-000000000090', '60000000-0000-0000-0000-000000000028', 'score', 'talent_leadership',            -3)
ON CONFLICT (id) DO NOTHING;
