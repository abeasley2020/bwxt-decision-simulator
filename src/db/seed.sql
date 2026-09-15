-- ============================================================================
-- BWXT Enterprise Decision Simulator - Core Seed
-- Operation Iron Horizon, version label v1.0
-- ============================================================================
--
-- APPLICATION ORDER
-- -----------------
-- Run these in the Supabase SQL editor, in this order. Each file is
-- idempotent and safe to re-run.
--
--   1. src/db/schema.sql           tables, indexes, triggers (fresh database only)
--   2. src/db/policies.sql         row level security (REQUIRED, see below)
--   3. src/db/seed.sql             THIS FILE: scenario, version, rounds, all 12
--                                  decision templates, the 8 performance
--                                  profiles and their rules
--   4. src/db/seed-round-1.sql     Round 1 decision options and effect rules
--   5. src/db/seed-round-2.sql     Round 2 decision options and effect rules
--   6. src/db/seed-round-3.sql     Round 3 decision options and effect rules
--   7. src/db/seed-verify.sql      row-count check, read the output
--   8. src/db/seed-dev-cohort.sql  LOCAL AND STAGING ONLY, never production
--
-- On an existing database also apply src/db/migrations/ in numeric order.
--
-- WITHOUT STEP 2 the public anon key can read and write every table. That was
-- verified against production on 2026-09-15. Do not skip it.
--
--
-- SCENARIO VERSION RESOLUTION
-- ---------------------------
-- This seed does NOT hardcode a scenario_version UUID.
--
-- Earlier revisions of this file, of scripts/seed.sql, and of CLAUDE.md all
-- named '20000000-0000-0000-0000-000000000001'. That is not the value
-- production uses. Production's single scenario_versions row is
-- 'fad1d4c9-a52b-42b2-96da-ff596aef7c86', created by the column default rather
-- than by this seed. Following the old documented procedure against production
-- would have inserted a SECOND, parallel scenario version and orphaned every
-- existing run, rather than repairing anything.
--
-- The fix is to resolve the id by (scenario key, version_label) instead of
-- naming it. That is what the target_version CTE below does, and it is why
-- this file now works unchanged against production, a fresh local database, or
-- a future v1.1.
--
-- The only UUIDs still written literally are the ones that ARE deterministic
-- in production and are referenced by foreign keys from participant data:
--
--   Scenario rounds      30000000-0000-0000-0000-00000000000{1,2,3}
--   Decision templates   40000000-0000-0000-0000-0000000000{01..12}
--   Decision options     60000000-0000-0000-0000-0000000000{01..42}
--   Effect rules         70000000-0000-0000-0000-000000000{001..130}
--   Performance profiles 80000000-0000-0000-0000-00000000000{1..8}
--   Profile rules        90000000-0000-0000-0000-00000000000{1..8}
--
-- Numbering, verified against production:
--   Round 1   options 0001-0015   rules 001-054
--   Round 2   options 0016-0028   rules 055-090
--   Round 3   options 0029-0042   rules 091-130
--
--
-- WHAT THE APPLICATION ACTUALLY READS FROM THESE TABLES
-- ----------------------------------------------------
-- Worth knowing before spending time on the prose below. The running app
-- selects only id and round_number from scenario_rounds, and only id, key and
-- scenario_round_id from decision_templates. It never queries decision_options
-- or decision_effect_rules at all. Every piece of narrative text and every
-- scoring effect comes from the authored content layer in
-- src/content/iron-horizon, which the API routes import directly.
--
-- So the text columns seeded here are documentation and future-proofing, not
-- product surface. What genuinely matters to a running system is the
-- decision_templates ids and keys, because decision_responses carries a
-- foreign key to them.
--
-- kpi_definitions and scoring_dimensions are deliberately not seeded. Both are
-- empty in production and the engine defines the two sets in code
-- (src/engine/kpi.ts, src/engine/scoring.ts).
--
--
-- SOURCE OF THIS FILE
-- -------------------
-- Regenerated 2026-09-15 from the live production database, so it reproduces
-- production exactly. It supersedes three overlapping artifacts that
-- previously disagreed with one another:
--
--   src/db/seed.sql          rounds, R1/R2/R3 templates (only 3 of Round 3's
--                            4), Round 2 options and rules, a dev cohort, and
--                            the profiles. Wrong scenario version UUID.
--   scripts/seed.sql         Round 1 options and rules. Same wrong UUID.
--   scripts/seed-round2.sql  Round 2. The only file with the correct UUID.
--
-- Round 3's decision options and effect rules existed in NO file in the
-- repository. They were applied to production by hand and never committed.
-- They are now captured in src/db/seed-round-3.sql.
--
-- ============================================================================


-- ─── Scenario ────────────────────────────────────────────────────────────────

INSERT INTO scenarios (id, key, title, description)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'operation_iron_horizon',
  'Operation Iron Horizon',
  'A 90-day executive leadership simulation for BWXT Leadership Academy.'
) ON CONFLICT (key) DO NOTHING;


-- ─── Scenario version ────────────────────────────────────────────────────────
--
-- ON CONFLICT (scenario_id, version_label) DO NOTHING leaves production's
-- existing fad1d4c9 row exactly as it is, including its own id. A fresh
-- database gets a server-generated uuid instead. Either way everything below
-- resolves through target_version, so neither case needs a literal.
--
-- intro_content and outro_content are null in production. They are set here
-- for completeness only; no code reads them. The orientation page renders from
-- src/content/iron-horizon/scenario.ts.

INSERT INTO scenario_versions (
  scenario_id, version_label, is_active,
  intro_content, outro_content, estimated_duration_minutes
)
SELECT s.id, 'v1.0', true,
  'You have just been named Acting President of BWXT''s largest operating division.',
  'Your simulation is complete. Your decisions have been scored across seven leadership dimensions.',
  105
FROM scenarios s
WHERE s.key = 'operation_iron_horizon'
ON CONFLICT (scenario_id, version_label) DO NOTHING;


-- ─── Scenario rounds ─────────────────────────────────────────────────────────
--
-- ON CONFLICT (id) DO UPDATE reconciles a row whose content was edited by
-- hand, and re-points scenario_version_id if it was ever wrong.
--
-- Caveat worth knowing: scenario_rounds also carries
-- unique (scenario_version_id, round_number), and decision_templates carries
-- unique (scenario_round_id, key). If a database somehow holds a round or
-- template with the right natural key but a DIFFERENT uuid, the ON CONFLICT
-- (id) clause will not catch it and the statement fails on the other
-- constraint instead. That is the correct outcome: it means the ids diverged
-- and participant foreign keys point at rows this seed does not describe, so
-- it needs a human. Production's ids match these literals exactly (verified
-- 2026-09-15), and a fresh database has no rows at all, so neither case
-- triggers it in practice.

WITH target_version AS (
  SELECT v.id
  FROM scenario_versions v
  JOIN scenarios s ON s.id = v.scenario_id
  WHERE s.key = 'operation_iron_horizon'
    AND v.version_label = 'v1.0'
)
INSERT INTO scenario_rounds (
  id, scenario_version_id, round_number, title, description,
  briefing_content, event_content, sort_order
)
SELECT r.id, v.id, r.round_number, r.title, r.description,
       r.briefing_content, r.event_content, r.sort_order
FROM target_version v
CROSS JOIN (VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, 1, 'Set Direction',
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
   1),
  ('30000000-0000-0000-0000-000000000002'::uuid, 2, 'Disruption',
   'Navigate compounding external and internal shocks at Day 45.',
   'Three simultaneous disruptions have hit the division. A federal regulator has issued a preliminary inquiry into a safety documentation gap. A well-funded competitor has announced entry into your core defense market. Two direct reports are disengaged. Operational throughput has dropped 8%.',
   'The Board''s Audit Committee chair has called an emergency briefing in 48 hours. You must have a response posture ready across all four disruptions before that call.',
   2),
  ('30000000-0000-0000-0000-000000000003'::uuid, 3, 'AI Inflection',
   'Navigate the AI adoption decision at Day 90.',
   'The division is 90 days in. The AI vendor pilot offer expires in 10 days. The Board wants a definitive position on AI adoption, governance, and workforce implications.',
   'The CEO has sent you a direct message: "I need to know if we''re leading on AI or reacting. Give me your definitive position."',
   3)
) AS r (id, round_number, title, description, briefing_content, event_content, sort_order)
ON CONFLICT (id) DO UPDATE SET
  scenario_version_id = EXCLUDED.scenario_version_id,
  round_number        = EXCLUDED.round_number,
  title               = EXCLUDED.title,
  description         = EXCLUDED.description,
  briefing_content    = EXCLUDED.briefing_content,
  event_content       = EXCLUDED.event_content,
  sort_order          = EXCLUDED.sort_order;


-- ─── Decision templates, all three rounds ────────────────────────────────────
--
-- All 12. The previous src/db/seed.sql seeded only 3 of Round 3's 4. The
-- fourth, r3_workforce_comms (40000000-...0012), existed in production but in
-- no committed file.
--
-- ON CONFLICT (id) DO UPDATE rather than DO NOTHING, so re-running this file
-- reconciles a template whose text or type was edited by hand.

INSERT INTO decision_templates (
  id, scenario_round_id, key, title, prompt,
  decision_type, min_choices, max_choices, is_required, sort_order
)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'r1_prioritization',
   '90-Day Priority Focus',
   'Select your top two priorities for the next 90 days. Your choices will shape resource allocation, communication, and operating rhythm across the division.',
   'multi_select', 2, 2, TRUE, 1),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'r1_capital',
   'Discretionary Budget Allocation',
   'You have $20M in discretionary budget to allocate across four areas. Distribute it as you see fit. Your allocation signals what you value and where you are placing your bets.',
   'resource_allocation', NULL, NULL, TRUE, 2),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'r1_talent_hoo',
   'Head of Operations: Retention Decision',
   'Your Head of Operations has been with BWXT for 14 years and is operationally irreplaceable in the short term. She''s offered to stay if given expanded authority over capital expenditure decisions. How do you respond?',
   'single_select', NULL, NULL, TRUE, 3),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'r1_communication',
   'First Leadership Communication',
   'You are drafting your first all-hands message to the division''s 3,200 employees. What is the primary tone and content of your opening communication?',
   'single_select', NULL, NULL, TRUE, 4),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'r2_regulatory',
   'Regulatory Response',
   'A federal regulator has issued a preliminary inquiry into a safety documentation gap. How do you respond?',
   'single_select', NULL, NULL, TRUE, 1),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', 'r2_competitor',
   'Competitor Threat Response',
   'A well-funded competitor has announced entry into your core defense market. How do you respond?',
   'single_select', NULL, NULL, TRUE, 2),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002', 'r2_talent_gap',
   'Talent Gap',
   'Two direct reports are disengaged and a leadership gap has emerged. Select two actions.',
   'multi_select', 2, 2, TRUE, 3),
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000002', 'r2_operational_stress',
   'Operational Stress Response',
   'Operational throughput has dropped 8% from a supplier delay. How do you respond?',
   'single_select', NULL, NULL, TRUE, 4),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', 'r3_ai_adoption',
   'AI Pilot Program Decision',
   'The AI vendor pilot offer expires in 10 days. Do you move forward?',
   'single_select', NULL, NULL, TRUE, 1),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', 'r3_ai_governance',
   'AI Governance Approach',
   'How do you structure governance for the AI program?',
   'single_select', NULL, NULL, TRUE, 2),
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', 'r3_modernization',
   'Modernization Sequencing',
   'In what order do you sequence the modernization initiatives?',
   'single_select', NULL, NULL, TRUE, 3),
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000003', 'r3_workforce_comms',
   'Workforce Implications',
   'How do you address the workforce implications of AI adoption?',
   'single_select', NULL, NULL, TRUE, 4)
ON CONFLICT (id) DO UPDATE SET
  scenario_round_id = EXCLUDED.scenario_round_id,
  key               = EXCLUDED.key,
  title             = EXCLUDED.title,
  prompt            = EXCLUDED.prompt,
  decision_type     = EXCLUDED.decision_type,
  min_choices       = EXCLUDED.min_choices,
  max_choices       = EXCLUDED.max_choices,
  is_required       = EXCLUDED.is_required,
  sort_order        = EXCLUDED.sort_order;


-- ─── Performance profiles and profile rules ──────────────────────────────────
--
-- These are what production profile assignment actually uses. The richer,
-- trait-gated rule set in src/content/iron-horizon/profiles.ts is the fallback
-- for an unseeded database and the source for the static walkthrough.
--
-- The two sets are INTENTIONALLY different: the DB rules are trait-free and
-- end with a '{}' catch-all on functional_optimizer, while the content rules
-- use hidden traits and have no catch-all. CLAUDE.md documents the divergence.
-- Do not reconcile it here.
--
-- Verified 2026-09-15: all 8 profiles and all 8 rules below are text-identical
-- to what production holds.
--
-- Stable UUIDs: profiles 80000000-0000-0000-0000-00000000000{1..8}
--               rules    90000000-0000-0000-0000-00000000000{1..8}
--
-- rule_logic_json keys supported by the engine:
--   scoreThresholds      dimension must be >= value
--   scoreCeilings        dimension must be <= value
--   kpiThresholds        KPI must be >= value
--   dominantDimensions   avg of named dims must exceed avg of all others
--   requiredTraits       hidden trait must have been acquired

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
-- Scores accumulate across 3 rounds; typical max per dimension is 15 to 20 pts.

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
    -- 8. Functional Optimizer: catch-all, no conditions, always matches
    '90000000-0000-0000-0000-000000000008',
    '80000000-0000-0000-0000-000000000008',
    80,
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

