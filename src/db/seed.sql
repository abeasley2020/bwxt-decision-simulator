-- BWXT Enterprise Decision Simulator — Seed Data
-- Run this after schema.sql in the Supabase SQL Editor.
-- All inserts are idempotent (ON CONFLICT DO NOTHING / DO UPDATE where noted).
--
-- Seeded UUIDs (stable for local development):
--   Scenario:         10000000-0000-0000-0000-000000000001
--   Scenario Version: 20000000-0000-0000-0000-000000000001
--   Round 1:          30000000-0000-0000-0000-000000000001
--   Round 2:          30000000-0000-0000-0000-000000000002
--   Round 3:          30000000-0000-0000-0000-000000000003
--   Template r1_prioritization:    40000000-0000-0000-0000-000000000001
--   Template r1_capital:           40000000-0000-0000-0000-000000000002
--   Template r1_talent_hoo:        40000000-0000-0000-0000-000000000003
--   Template r1_communication:     40000000-0000-0000-0000-000000000004
--   Template r2_regulatory:        40000000-0000-0000-0000-000000000005
--   Template r2_competitor:        40000000-0000-0000-0000-000000000006
--   Template r2_talent_gap:        40000000-0000-0000-0000-000000000007
--   Template r2_operational_stress:40000000-0000-0000-0000-000000000011
--   Template r3_ai_adoption:       40000000-0000-0000-0000-000000000008
--   Template r3_ai_governance:     40000000-0000-0000-0000-000000000009
--   Template r3_modernization:     40000000-0000-0000-0000-000000000010
--   Dev Cohort:       50000000-0000-0000-0000-000000000001
--
-- Round 2 Options: 60000000-0000-0000-0000-000000000016 through ...0028
-- Round 2 Rules:   70000000-0000-0000-0000-000000000055 through ...0090

-- ─── Scenario ────────────────────────────────────────────────────────────────

INSERT INTO scenarios (id, key, title, description)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'operation_iron_horizon',
  'Operation Iron Horizon',
  'A 90-day executive leadership simulation for BWXT Leadership Academy.'
) ON CONFLICT (key) DO NOTHING;

-- ─── Scenario Version ─────────────────────────────────────────────────────────

INSERT INTO scenario_versions (
  id, scenario_id, version_label, is_active,
  intro_content, outro_content, estimated_duration_minutes
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'v1.0',
  true,
  'You have just been named Acting President of BWXT''s largest operating division.',
  'Your simulation is complete. Your decisions have been scored across seven leadership dimensions.',
  105
) ON CONFLICT (scenario_id, version_label) DO NOTHING;

-- ─── Scenario Rounds ──────────────────────────────────────────────────────────

INSERT INTO scenario_rounds (
  id, scenario_version_id, round_number, title, description,
  briefing_content, event_content, sort_order
)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Set Direction',
    'Establish your leadership priorities in the first 30 days.',
    'It''s Day 1. You''ve received your first executive briefing. Q1 revenue is tracking 6% below plan. The Safety team has flagged two open non-conformances. Your Head of Operations has tendered a conditional resignation. The Board expects a clear direction memo within 72 hours.',
    'The Board''s Operating Committee has convened an emergency call. They want to know your top priorities for the next 90 days and how you are allocating the available discretionary budget of $20M.',
    1
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    2,
    'Disruption',
    'Navigate compounding external and internal shocks at Day 45.',
    'Three simultaneous disruptions have hit the division. A federal regulator has issued a preliminary inquiry into a safety documentation gap. A well-funded competitor has announced entry into your core defense market. Two direct reports are disengaged. Operational throughput has dropped 8%.',
    'The Board''s Audit Committee chair has called an emergency briefing in 48 hours. You must have a response posture ready across all four disruptions before that call.',
    2
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    3,
    'AI Inflection',
    'Lead through a technology disruption in the final 30 days.',
    'The Board has asked for a position on AI integration. Your competitors are moving fast. Your workforce has concerns. The window to act is 30 days.',
    'The Chief Digital Officer has put a proposal on your desk: a $15M AI pilot program that could transform operations — or expose the division to new risks.',
    3
  )
ON CONFLICT (scenario_version_id, round_number) DO NOTHING;

-- ─── Decision Templates — Round 1 ─────────────────────────────────────────────

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
    'Select your top two priorities for the next 90 days.',
    'multi_select', 2, 2, true, 1
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'r1_capital',
    'Discretionary Budget Allocation',
    'You have $20M in discretionary budget to allocate across four areas.',
    'resource_allocation', null, null, true, 2
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'r1_talent_hoo',
    'Head of Operations: Retention Decision',
    'How do you respond to the Head of Operations retention situation?',
    'single_select', null, null, true, 3
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    'r1_communication',
    'First Leadership Communication',
    'What is the primary tone and content of your opening all-hands communication?',
    'single_select', null, null, true, 4
  )
ON CONFLICT (scenario_round_id, key) DO NOTHING;

-- ─── Decision Templates — Round 2 ─────────────────────────────────────────────
-- ON CONFLICT (id) DO UPDATE to allow re-running when keys have changed.

INSERT INTO decision_templates (
  id, scenario_round_id, key, title, prompt,
  decision_type, min_choices, max_choices, is_required, sort_order
)
VALUES
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000002',
    'r2_regulatory',
    'Regulatory Response',
    'A federal regulator has issued a preliminary inquiry into a safety documentation gap. How do you respond?',
    'single_select', null, null, true, 1
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000002',
    'r2_competitor',
    'Competitor Threat Response',
    'A well-funded competitor has announced entry into your core defense market. How do you respond?',
    'single_select', null, null, true, 2
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000002',
    'r2_talent_gap',
    'Talent Gap',
    'Two direct reports are disengaged and a leadership gap has emerged. Select two actions.',
    'multi_select', 2, 2, true, 3
  ),
  (
    '40000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000002',
    'r2_operational_stress',
    'Operational Stress Response',
    'Operational throughput has dropped 8% from a supplier delay. How do you respond?',
    'single_select', null, null, true, 4
  )
ON CONFLICT (id) DO UPDATE
  SET key           = excluded.key,
      title         = excluded.title,
      prompt        = excluded.prompt,
      decision_type = excluded.decision_type,
      min_choices   = excluded.min_choices,
      max_choices   = excluded.max_choices,
      is_required   = excluded.is_required,
      sort_order    = excluded.sort_order;

-- ─── Decision Templates — Round 3 ─────────────────────────────────────────────

INSERT INTO decision_templates (
  id, scenario_round_id, key, title, prompt,
  decision_type, min_choices, max_choices, is_required, sort_order
)
VALUES
  (
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000003',
    'r3_ai_adoption',
    'AI Pilot Program Decision',
    'The CDO is proposing a $15M AI pilot. What is your decision?',
    'single_select', null, null, true, 1
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000003',
    'r3_ai_governance',
    'AI Governance Approach',
    'How will you govern the use of AI across the division?',
    'single_select', null, null, true, 2
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000003',
    'r3_modernization',
    'Digital Modernization Sequencing',
    'Which digital modernization initiatives do you sequence first?',
    'multi_select', 1, 2, true, 3
  )
ON CONFLICT (scenario_round_id, key) DO NOTHING;

-- ─── Decision Options — Round 2 ───────────────────────────────────────────────
-- Options 60000000-0000-0000-0000-000000000016 through ...0028
-- (Round 1 occupies 0001–0015)

INSERT INTO decision_options (
  id, decision_template_id, key, label, description, sort_order
)
VALUES
  -- r2_regulatory options
  (
    '60000000-0000-0000-0000-000000000016',
    '40000000-0000-0000-0000-000000000005',
    'r2_reg_proactive',
    'Engage proactively with the regulator before they escalate',
    'Reach out directly to the regulatory contact to acknowledge the gap, present a remediation plan, and establish a cooperative posture.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000017',
    '40000000-0000-0000-0000-000000000005',
    'r2_reg_internal',
    'Conduct an internal review first, then decide whether to disclose',
    'Commission a rapid internal review before any external communication. Reserve disclosure decisions until the facts are clear.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000018',
    '40000000-0000-0000-0000-000000000005',
    'r2_reg_legal',
    'Defer to legal and pause all related operations',
    'Place all affected operations on hold and route all communications through legal counsel.',
    3
  ),
  -- r2_competitor options
  (
    '60000000-0000-0000-0000-000000000019',
    '40000000-0000-0000-0000-000000000006',
    'r2_comp_partnership',
    'Accelerate a strategic partnership to close capability gap',
    'Identify and fast-track a manufacturing or technology partnership that closes the gap the competitor is exploiting.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000020',
    '40000000-0000-0000-0000-000000000006',
    'r2_comp_rnd',
    'Double down on internal R&D and differentiation',
    'Redirect discretionary investment into accelerated R&D to deepen technical differentiation.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000021',
    '40000000-0000-0000-0000-000000000006',
    'r2_comp_hold',
    'Stay the course — competitors often overpromise',
    'Maintain current strategy. Monitor the competitor''s execution before reacting.',
    3
  ),
  -- r2_talent_gap options
  (
    '60000000-0000-0000-0000-000000000022',
    '40000000-0000-0000-0000-000000000007',
    'r2_tal_promote',
    'Promote a high-potential internal candidate immediately',
    'Identify the strongest internal candidate and move them into an expanded role now.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000023',
    '40000000-0000-0000-0000-000000000007',
    'r2_tal_search',
    'Launch an accelerated external search',
    'Engage an executive search firm immediately with a 60-day placement target.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000024',
    '40000000-0000-0000-0000-000000000007',
    'r2_tal_redistribute',
    'Redistribute responsibilities across existing leadership',
    'Realign portfolios across the current leadership team to cover the gap without adding headcount.',
    3
  ),
  (
    '60000000-0000-0000-0000-000000000025',
    '40000000-0000-0000-0000-000000000007',
    'r2_tal_interim',
    'Bring in an interim executive while searching',
    'Engage a specialized interim executive firm to place a senior leader within two weeks.',
    4
  ),
  -- r2_operational_stress options
  (
    '60000000-0000-0000-0000-000000000026',
    '40000000-0000-0000-0000-000000000011',
    'r2_ops_scope',
    'Temporarily reduce scope on lower-priority programs',
    'Pause or deprioritize lower-urgency work to free capacity for constrained programs.',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000027',
    '40000000-0000-0000-0000-000000000011',
    'r2_ops_realloc',
    'Request emergency budget reallocation',
    'Request an emergency budget draw to qualify a backup supplier and restore capacity through parallel sourcing.',
    2
  ),
  (
    '60000000-0000-0000-0000-000000000028',
    '40000000-0000-0000-0000-000000000011',
    'r2_ops_push',
    'Push delivery teams harder and accept short-term burnout risk',
    'Ask delivery teams to absorb the throughput gap through extended hours and compressed timelines.',
    3
  )
ON CONFLICT (decision_template_id, key) DO NOTHING;

-- ─── Decision Effect Rules — Round 2 ──────────────────────────────────────────
-- Rules 70000000-0000-0000-0000-000000000055 through ...0090
-- (Round 1 occupies 0001–0054)

INSERT INTO decision_effect_rules (
  id, decision_option_id, effect_type, target_key, effect_value
)
VALUES
  -- r2_reg_proactive (3 rules)
  ('70000000-0000-0000-0000-000000000055', '60000000-0000-0000-0000-000000000016', 'kpi',   'safety_compliance_confidence', 12),
  ('70000000-0000-0000-0000-000000000056', '60000000-0000-0000-0000-000000000016', 'kpi',   'executive_confidence',          6),
  ('70000000-0000-0000-0000-000000000057', '60000000-0000-0000-0000-000000000016', 'score', 'enterprise_judgment',           4),
  -- r2_reg_internal (3 rules)
  ('70000000-0000-0000-0000-000000000058', '60000000-0000-0000-0000-000000000017', 'kpi',   'safety_compliance_confidence',  5),
  ('70000000-0000-0000-0000-000000000059', '60000000-0000-0000-0000-000000000017', 'kpi',   'executive_confidence',          2),
  ('70000000-0000-0000-0000-000000000060', '60000000-0000-0000-0000-000000000017', 'score', 'enterprise_judgment',           2),
  -- r2_reg_legal (3 rules)
  ('70000000-0000-0000-0000-000000000061', '60000000-0000-0000-0000-000000000018', 'kpi',   'safety_compliance_confidence', -5),
  ('70000000-0000-0000-0000-000000000062', '60000000-0000-0000-0000-000000000018', 'kpi',   'decision_velocity',            -8),
  ('70000000-0000-0000-0000-000000000063', '60000000-0000-0000-0000-000000000018', 'score', 'enterprise_judgment',          -2),
  -- r2_comp_partnership (3 rules)
  ('70000000-0000-0000-0000-000000000064', '60000000-0000-0000-0000-000000000019', 'kpi',   'digital_maturity',              8),
  ('70000000-0000-0000-0000-000000000065', '60000000-0000-0000-0000-000000000019', 'kpi',   'financial_performance_outlook', 5),
  ('70000000-0000-0000-0000-000000000066', '60000000-0000-0000-0000-000000000019', 'score', 'technology_data_leadership',    4),
  -- r2_comp_rnd (3 rules)
  ('70000000-0000-0000-0000-000000000067', '60000000-0000-0000-0000-000000000020', 'kpi',   'digital_maturity',             10),
  ('70000000-0000-0000-0000-000000000068', '60000000-0000-0000-0000-000000000020', 'kpi',   'financial_performance_outlook', -4),
  ('70000000-0000-0000-0000-000000000069', '60000000-0000-0000-0000-000000000020', 'score', 'technology_data_leadership',    5),
  -- r2_comp_hold (2 rules)
  ('70000000-0000-0000-0000-000000000070', '60000000-0000-0000-0000-000000000021', 'kpi',   'financial_performance_outlook', 3),
  ('70000000-0000-0000-0000-000000000071', '60000000-0000-0000-0000-000000000021', 'score', 'enterprise_judgment',          -2),
  -- r2_tal_promote (3 rules)
  ('70000000-0000-0000-0000-000000000072', '60000000-0000-0000-0000-000000000022', 'kpi',   'talent_readiness',              8),
  ('70000000-0000-0000-0000-000000000073', '60000000-0000-0000-0000-000000000022', 'kpi',   'cross_functional_alignment',    5),
  ('70000000-0000-0000-0000-000000000074', '60000000-0000-0000-0000-000000000022', 'score', 'talent_leadership',             4),
  -- r2_tal_search (2 rules)
  ('70000000-0000-0000-0000-000000000075', '60000000-0000-0000-0000-000000000023', 'kpi',   'talent_readiness',              5),
  ('70000000-0000-0000-0000-000000000076', '60000000-0000-0000-0000-000000000023', 'score', 'talent_leadership',             2),
  -- r2_tal_redistribute (3 rules)
  ('70000000-0000-0000-0000-000000000077', '60000000-0000-0000-0000-000000000024', 'kpi',   'talent_readiness',              3),
  ('70000000-0000-0000-0000-000000000078', '60000000-0000-0000-0000-000000000024', 'kpi',   'operational_throughput',       -4),
  ('70000000-0000-0000-0000-000000000079', '60000000-0000-0000-0000-000000000024', 'score', 'talent_leadership',             1),
  -- r2_tal_interim (2 rules)
  ('70000000-0000-0000-0000-000000000080', '60000000-0000-0000-0000-000000000025', 'kpi',   'talent_readiness',              6),
  ('70000000-0000-0000-0000-000000000081', '60000000-0000-0000-0000-000000000025', 'score', 'decision_velocity_with_discipline', 3),
  -- r2_ops_scope (3 rules)
  ('70000000-0000-0000-0000-000000000082', '60000000-0000-0000-0000-000000000026', 'kpi',   'operational_throughput',        6),
  ('70000000-0000-0000-0000-000000000083', '60000000-0000-0000-0000-000000000026', 'kpi',   'financial_performance_outlook', 3),
  ('70000000-0000-0000-0000-000000000084', '60000000-0000-0000-0000-000000000026', 'score', 'enterprise_judgment',           2),
  -- r2_ops_realloc (3 rules)
  ('70000000-0000-0000-0000-000000000085', '60000000-0000-0000-0000-000000000027', 'kpi',   'operational_throughput',        8),
  ('70000000-0000-0000-0000-000000000086', '60000000-0000-0000-0000-000000000027', 'kpi',   'financial_performance_outlook', -5),
  ('70000000-0000-0000-0000-000000000087', '60000000-0000-0000-0000-000000000027', 'score', 'financial_strategic_acumen',    3),
  -- r2_ops_push (3 rules)
  ('70000000-0000-0000-0000-000000000088', '60000000-0000-0000-0000-000000000028', 'kpi',   'operational_throughput',       10),
  ('70000000-0000-0000-0000-000000000089', '60000000-0000-0000-0000-000000000028', 'kpi',   'talent_readiness',             -8),
  ('70000000-0000-0000-0000-000000000090', '60000000-0000-0000-0000-000000000028', 'score', 'talent_leadership',            -3)
ON CONFLICT (id) DO NOTHING;

-- ─── Development Cohort (local testing only) ──────────────────────────────────
-- Remove or replace before deploying to production.

INSERT INTO cohorts (id, name, description, status, scenario_version_id)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  'Development Cohort',
  'Local testing cohort — not for production use.',
  'active',
  '20000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ─── Performance Profiles ────────────────────────────────────────────────────
-- Stable UUIDs: 80000000-0000-0000-0000-000000000001 through ...0008
-- Rules:        90000000-0000-0000-0000-000000000001 through ...0008
--
-- rule_logic_json keys supported by the engine:
--   scoreThresholds  — dimension must be >= value
--   scoreCeilings    — dimension must be <= value
--   kpiThresholds    — KPI must be >= value
--   dominantDimensions — avg of named dims must exceed avg of all others
--   requiredTraits   — hidden trait must have been acquired

INSERT INTO performance_profiles (id, key, label, description, strengths_text, blind_spots_text)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    'enterprise_catalyst',
    'Enterprise Catalyst',
    'Drives enterprise-wide momentum by balancing urgency with strategic discipline. Excels at system-level thinking and cross-functional mobilization.',
    'Strong enterprise judgment. Effective at aligning competing priorities. Builds momentum without sacrificing discipline. Trusted by the Board and the team.',
    'May underweight deep operational or functional expertise. Can move faster than the organization is ready for. Risk of over-relying on high-level alignment without driving specific execution.'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    'disciplined_accelerator',
    'Disciplined Accelerator',
    'Moves fast but with clear frameworks. Combines pace with process, creating momentum without chaos.',
    'High decision velocity with structured thinking. Effective at breaking log-jams and driving delivery. Builds confidence through consistent follow-through.',
    'Can underweight stakeholder alignment and communication. May sacrifice long-term talent investment for short-term output. At risk of burning out the team.'
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    'innovation_without_guardrails',
    'Innovation Without Guardrails',
    'Drives transformation energy but without the governance structures or workforce readiness to sustain it. High digital ambition, insufficient system thinking.',
    'Visionary on technology and transformation. Energizes the organization around the future. Attracts digital talent and partnerships.',
    'Underweights compliance, safety, and workforce implications. Creates risk exposure through speed without governance. May lose the organization in transformation.'
  ),
  (
    '80000000-0000-0000-0000-000000000004',
    'talent_blind_spot',
    'Talent Blind Spot',
    'Strong strategically and operationally, but consistently underweights people development and organizational capability. Execution suffers as talent gaps compound.',
    'Effective at strategic and operational decision-making. Can execute in the short term. Strong with structure, process, and financial metrics.',
    'Chronically underinvests in talent, succession, and workforce readiness. Organization becomes brittle. Retention risk compounds over time.'
  ),
  (
    '80000000-0000-0000-0000-000000000005',
    'cautious_operator',
    'Cautious Operator',
    'Prioritizes stability and risk mitigation. Makes few mistakes but can leave value unrealized by moving too conservatively.',
    'Strong on compliance, risk management, and operational stability. Rarely makes catastrophic errors. Maintains trust through consistency.',
    'Under-indexes on velocity and transformation. May struggle in dynamic environments requiring rapid adaptation. Board may lack confidence in competitive positioning.'
  ),
  (
    '80000000-0000-0000-0000-000000000006',
    'strategic_communicator',
    'Strategic Communicator',
    'Creates clarity and alignment through exceptional communication. Moves the organization through narrative, trust, and shared direction.',
    'Strong communicator. Builds stakeholder trust rapidly. Effective at driving alignment across functions and levels. Creates followership.',
    'May over-invest in alignment at the expense of action. Can use communication as a substitute for hard decisions. Results can lag narrative.'
  ),
  (
    '80000000-0000-0000-0000-000000000007',
    'data_enabled_builder',
    'Data-Enabled Builder',
    'Builds the infrastructure and capability for long-term data and digital advantage. Patient, systematic, and oriented toward sustainable transformation.',
    'Exceptional at building durable digital and data foundations. Strong on long-term capability building. Effective at sequencing transformation investments.',
    'Can be slow to show visible near-term impact. May under-prioritize revenue and commercial urgency. Risk of investing in infrastructure before the organization is ready to use it.'
  ),
  (
    '80000000-0000-0000-0000-000000000008',
    'functional_optimizer',
    'Functional Optimizer',
    'Deep in the operations and financial mechanics of the business. Excels at efficiency and execution, but can struggle to lead enterprise transformation.',
    'Strong financial and operational acumen. Reliable executor. Manages complexity well within the core business. Trusted by functional teams.',
    'May underinvest in digital, talent, or external relationships. Can optimize locally at the expense of enterprise value. Risk of functional tunnel vision.'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Profile Rules ────────────────────────────────────────────────────────────
-- Evaluated in priority_order (ascending). First match wins.
-- Scores accumulate across 3 rounds; typical max per dimension is ~15–20 pts.

INSERT INTO profile_rules (id, performance_profile_id, priority_order, rule_logic_json)
VALUES
  (
    -- 1. Enterprise Catalyst: strong judgment + velocity + talent
    '90000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    10,
    '{"scoreThresholds": {"enterprise_judgment": 15, "decision_velocity_with_discipline": 10, "talent_leadership": 10}}'
  ),
  (
    -- 2. Disciplined Accelerator: high velocity + financial acumen
    '90000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    20,
    '{"scoreThresholds": {"decision_velocity_with_discipline": 12, "financial_strategic_acumen": 8}}'
  ),
  (
    -- 3. Innovation Without Guardrails: high tech + low judgment
    '90000000-0000-0000-0000-000000000003',
    '80000000-0000-0000-0000-000000000003',
    30,
    '{"scoreThresholds": {"technology_data_leadership": 12}, "scoreCeilings": {"enterprise_judgment": 6}}'
  ),
  (
    -- 4. Talent Blind Spot: talent score very low
    '90000000-0000-0000-0000-000000000004',
    '80000000-0000-0000-0000-000000000004',
    40,
    '{"scoreCeilings": {"talent_leadership": 4}}'
  ),
  (
    -- 5. Cautious Operator: very low decision velocity
    '90000000-0000-0000-0000-000000000005',
    '80000000-0000-0000-0000-000000000005',
    50,
    '{"scoreCeilings": {"decision_velocity_with_discipline": 5}}'
  ),
  (
    -- 6. Strategic Communicator: high comms + strong judgment
    '90000000-0000-0000-0000-000000000006',
    '80000000-0000-0000-0000-000000000006',
    60,
    '{"scoreThresholds": {"communication_alignment": 8, "enterprise_judgment": 8}}'
  ),
  (
    -- 7. Data-Enabled Builder: high tech dimension
    '90000000-0000-0000-0000-000000000007',
    '80000000-0000-0000-0000-000000000007',
    70,
    '{"scoreThresholds": {"technology_data_leadership": 10}}'
  ),
  (
    -- 8. Functional Optimizer: fallback — no conditions, always matches
    '90000000-0000-0000-0000-000000000008',
    '80000000-0000-0000-0000-000000000008',
    80,
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── After running this seed ─────────────────────────────────────────────────
-- To test as a participant:
--
-- 1. Sign in via magic link to create your Supabase auth user.
-- 2. Run the following SQL (replace the UUIDs with your own values):
--
--    INSERT INTO users (id, email, first_name, last_name, role)
--    VALUES (
--      'YOUR_AUTH_USER_UUID',   -- from auth.users.id
--      'you@example.com',
--      'First',
--      'Last',
--      'participant'
--    ) ON CONFLICT (id) DO NOTHING;
--
--    INSERT INTO cohort_memberships (user_id, cohort_id, cohort_role, invitation_status)
--    VALUES (
--      'YOUR_AUTH_USER_UUID',
--      '50000000-0000-0000-0000-000000000001',
--      'participant',
--      'accepted'
--    ) ON CONFLICT (user_id, cohort_id) DO NOTHING;
--
-- 3. Visit /simulation — a run will be auto-created and you will be
--    redirected to the orientation page.
