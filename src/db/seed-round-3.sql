-- ============================================================================
-- BWXT Enterprise Decision Simulator - Round 3 options and effect rules
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
--   decision_options      60000000-0000-0000-0000-00000000000029-0042
--   decision_effect_rules 70000000-0000-0000-0000-000000000091-130
--
-- Expected row counts: 14 options, 40 effect rules.
--
-- Generated 2026-09-15 from the live production database.
--
-- NEW FILE. Before 2026-09-15 Round 3's decision options and effect rules
-- existed in NO file in this repository. They were present in production,
-- applied by hand via SQL that was never committed. This file captures them
-- exactly as production holds them, so the repository can finally reproduce
-- the live scenario.
--
-- KNOWN DIVERGENCE FROM THE CONTENT LAYER, do not silently "fix" either side.
-- The rows below do not match src/content/iron-horizon/rounds/round-3.ts.
-- Round 3 was authored twice and the two versions were never reconciled:
--
--   1. r3_modernization is single_select here and multi_select
--      (minChoices 1, maxChoices 2) in the content layer.
--   2. Every option label and description differs. Compare
--      "Defer the pilot, conditions are not right" (production) with
--      "Decline and build the governance framework first" (content).
--   3. The template prompts differ. Production asks "How do you structure
--      governance for the AI program?"; the content layer asks how you handle
--      the tension between legal and the digital team.
--   4. Effect counts differ sharply: 40 rules here against 77 in the content
--      layer, and production has ZERO hidden_trait rules anywhere in Round 3
--      while the content layer has 8.
--   5. Effect values differ where the same target appears. For example
--      r3_ai_accept_full talent_readiness is -5 here and -6 in the content
--      layer, and technology_data_leadership is 6 here and 5 there.
--
-- WHICH ONE PARTICIPANTS ACTUALLY EXPERIENCE: the content layer. The submit
-- route imports IRON_HORIZON_VERSION from src/content/iron-horizon and scores
-- against that; it never reads decision_options or decision_effect_rules. The
-- rows below are therefore inert with respect to scoring. They still matter
-- for schema completeness, for anyone provisioning a fresh environment, and
-- because a future DB-driven scoring path would silently pick up this weaker
-- rule set.
--
-- Recommended follow-up, not applied here: decide which Round 3 is canonical
-- and regenerate the other from it. That is a content decision for the SME,
-- not a mechanical merge.
--
-- ============================================================================


-- ─── Decision options ────────────────────────────────────────────────────────

INSERT INTO decision_options (id, decision_template_id, key, label, description, sort_order, metadata_json)
VALUES
  ('60000000-0000-0000-0000-000000000029', '40000000-0000-0000-0000-000000000008', 'r3_ai_accept_full',
   'Accept the full pilot — move fast, learn by doing',
   'Authorize the full pilot across two production lines. Accept that governance and workforce preparation will lag.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000030', '40000000-0000-0000-0000-000000000008', 'r3_ai_accept_limited',
   'Accept a limited pilot — one line, with governance conditions',
   'Negotiate a single production line pilot with explicit governance checkpoints.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000008', 'r3_ai_defer',
   'Defer the pilot — conditions are not right',
   'Decline the current offer. Establish internal readiness criteria before any AI commitment.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000032', '40000000-0000-0000-0000-000000000009', 'r3_gov_full_framework',
   'Establish a full AI governance framework before expanding',
   'Create a formal AI steering committee, risk framework, and review process before any expansion.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000033', '40000000-0000-0000-0000-000000000009', 'r3_gov_lean',
   'Implement lean governance — lightweight and fast',
   'Assign a single AI program owner with a simplified decision log and quarterly review.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000034', '40000000-0000-0000-0000-000000000009', 'r3_gov_skip',
   'Skip formal governance — move at market speed',
   'Let program teams self-govern. Avoid bureaucracy that slows AI adoption.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000035', '40000000-0000-0000-0000-000000000010', 'r3_mod_ops',
   'Operations first — stabilize before transforming',
   'Prioritize operational reliability and throughput before layering in new technology.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000036', '40000000-0000-0000-0000-000000000010', 'r3_mod_data',
   'Data infrastructure first — build the foundation',
   'Invest in data pipelines and platforms before deploying AI or process automation.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000037', '40000000-0000-0000-0000-000000000010', 'r3_mod_talent',
   'Talent and capability first — people before technology',
   'Upskill the workforce and build internal AI literacy before committing to platforms.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000038', '40000000-0000-0000-0000-000000000010', 'r3_mod_commercial',
   'Commercial outcomes first — follow the revenue',
   'Sequence modernization around the highest-revenue programs and customer commitments.',
   4, NULL),
  ('60000000-0000-0000-0000-000000000039', '40000000-0000-0000-0000-000000000012', 'r3_wf_commit',
   'Make a public commitment to no AI-driven layoffs',
   'Announce formally that AI adoption will not result in workforce reductions.',
   1, NULL),
  ('60000000-0000-0000-0000-000000000040', '40000000-0000-0000-0000-000000000012', 'r3_wf_reskill',
   'Launch a reskilling program tied to AI deployment',
   'Invest in structured reskilling so affected workers transition into new AI-adjacent roles.',
   2, NULL),
  ('60000000-0000-0000-0000-000000000041', '40000000-0000-0000-0000-000000000012', 'r3_wf_engage_union',
   'Engage union leadership proactively before announcing',
   'Brief union representatives before any public AI announcement to build trust.',
   3, NULL),
  ('60000000-0000-0000-0000-000000000042', '40000000-0000-0000-0000-000000000012', 'r3_wf_minimal',
   'Communicate minimally — let results speak',
   'Avoid over-promising. Communicate AI plans only when decisions are final.',
   4, NULL)
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
  -- r3_ai_accept_full
  ('70000000-0000-0000-0000-000000000091', '60000000-0000-0000-0000-000000000029', 'kpi', 'digital_maturity', 15, NULL),
  ('70000000-0000-0000-0000-000000000092', '60000000-0000-0000-0000-000000000029', 'kpi', 'talent_readiness', -5, NULL),
  ('70000000-0000-0000-0000-000000000093', '60000000-0000-0000-0000-000000000029', 'score', 'technology_data_leadership', 6, NULL),
  ('70000000-0000-0000-0000-000000000094', '60000000-0000-0000-0000-000000000029', 'score', 'enterprise_judgment', -2, NULL),
  -- r3_ai_accept_limited
  ('70000000-0000-0000-0000-000000000095', '60000000-0000-0000-0000-000000000030', 'kpi', 'digital_maturity', 8, NULL),
  ('70000000-0000-0000-0000-000000000096', '60000000-0000-0000-0000-000000000030', 'kpi', 'safety_compliance_confidence', 4, NULL),
  ('70000000-0000-0000-0000-000000000097', '60000000-0000-0000-0000-000000000030', 'score', 'technology_data_leadership', 4, NULL),
  ('70000000-0000-0000-0000-000000000098', '60000000-0000-0000-0000-000000000030', 'score', 'enterprise_judgment', 3, NULL),
  -- r3_ai_defer
  ('70000000-0000-0000-0000-000000000099', '60000000-0000-0000-0000-000000000031', 'kpi', 'digital_maturity', -5, NULL),
  ('70000000-0000-0000-0000-000000000100', '60000000-0000-0000-0000-000000000031', 'kpi', 'executive_confidence', -4, NULL),
  ('70000000-0000-0000-0000-000000000101', '60000000-0000-0000-0000-000000000031', 'score', 'technology_data_leadership', -3, NULL),
  -- r3_gov_full_framework
  ('70000000-0000-0000-0000-000000000102', '60000000-0000-0000-0000-000000000032', 'kpi', 'safety_compliance_confidence', 8, NULL),
  ('70000000-0000-0000-0000-000000000103', '60000000-0000-0000-0000-000000000032', 'kpi', 'decision_velocity', -5, NULL),
  ('70000000-0000-0000-0000-000000000104', '60000000-0000-0000-0000-000000000032', 'score', 'enterprise_judgment', 4, NULL),
  -- r3_gov_lean
  ('70000000-0000-0000-0000-000000000105', '60000000-0000-0000-0000-000000000033', 'kpi', 'decision_velocity', 5, NULL),
  ('70000000-0000-0000-0000-000000000106', '60000000-0000-0000-0000-000000000033', 'score', 'decision_velocity_with_discipline', 4, NULL),
  ('70000000-0000-0000-0000-000000000107', '60000000-0000-0000-0000-000000000033', 'score', 'enterprise_judgment', 2, NULL),
  -- r3_gov_skip
  ('70000000-0000-0000-0000-000000000108', '60000000-0000-0000-0000-000000000034', 'kpi', 'decision_velocity', 8, NULL),
  ('70000000-0000-0000-0000-000000000109', '60000000-0000-0000-0000-000000000034', 'kpi', 'safety_compliance_confidence', -8, NULL),
  ('70000000-0000-0000-0000-000000000110', '60000000-0000-0000-0000-000000000034', 'score', 'enterprise_judgment', -4, NULL),
  -- r3_mod_ops
  ('70000000-0000-0000-0000-000000000111', '60000000-0000-0000-0000-000000000035', 'kpi', 'operational_throughput', 8, NULL),
  ('70000000-0000-0000-0000-000000000112', '60000000-0000-0000-0000-000000000035', 'score', 'financial_strategic_acumen', 3, NULL),
  -- r3_mod_data
  ('70000000-0000-0000-0000-000000000113', '60000000-0000-0000-0000-000000000036', 'kpi', 'digital_maturity', 10, NULL),
  ('70000000-0000-0000-0000-000000000114', '60000000-0000-0000-0000-000000000036', 'score', 'technology_data_leadership', 5, NULL),
  -- r3_mod_talent
  ('70000000-0000-0000-0000-000000000115', '60000000-0000-0000-0000-000000000037', 'kpi', 'talent_readiness', 10, NULL),
  ('70000000-0000-0000-0000-000000000116', '60000000-0000-0000-0000-000000000037', 'score', 'talent_leadership', 4, NULL),
  -- r3_mod_commercial
  ('70000000-0000-0000-0000-000000000117', '60000000-0000-0000-0000-000000000038', 'kpi', 'financial_performance_outlook', 8, NULL),
  ('70000000-0000-0000-0000-000000000118', '60000000-0000-0000-0000-000000000038', 'score', 'financial_strategic_acumen', 4, NULL),
  -- r3_wf_commit
  ('70000000-0000-0000-0000-000000000119', '60000000-0000-0000-0000-000000000039', 'kpi', 'cross_functional_alignment', 8, NULL),
  ('70000000-0000-0000-0000-000000000120', '60000000-0000-0000-0000-000000000039', 'kpi', 'talent_readiness', 5, NULL),
  ('70000000-0000-0000-0000-000000000121', '60000000-0000-0000-0000-000000000039', 'score', 'communication_alignment', 5, NULL),
  -- r3_wf_reskill
  ('70000000-0000-0000-0000-000000000122', '60000000-0000-0000-0000-000000000040', 'kpi', 'talent_readiness', 8, NULL),
  ('70000000-0000-0000-0000-000000000123', '60000000-0000-0000-0000-000000000040', 'kpi', 'digital_maturity', 4, NULL),
  ('70000000-0000-0000-0000-000000000124', '60000000-0000-0000-0000-000000000040', 'score', 'talent_leadership', 5, NULL),
  -- r3_wf_engage_union
  ('70000000-0000-0000-0000-000000000125', '60000000-0000-0000-0000-000000000041', 'kpi', 'cross_functional_alignment', 6, NULL),
  ('70000000-0000-0000-0000-000000000126', '60000000-0000-0000-0000-000000000041', 'score', 'communication_alignment', 4, NULL),
  ('70000000-0000-0000-0000-000000000127', '60000000-0000-0000-0000-000000000041', 'score', 'enterprise_judgment', 2, NULL),
  -- r3_wf_minimal
  ('70000000-0000-0000-0000-000000000128', '60000000-0000-0000-0000-000000000042', 'kpi', 'cross_functional_alignment', -5, NULL),
  ('70000000-0000-0000-0000-000000000129', '60000000-0000-0000-0000-000000000042', 'kpi', 'talent_readiness', -3, NULL),
  ('70000000-0000-0000-0000-000000000130', '60000000-0000-0000-0000-000000000042', 'score', 'communication_alignment', -2, NULL)
ON CONFLICT (id) DO UPDATE SET
  decision_option_id = EXCLUDED.decision_option_id,
  effect_type        = EXCLUDED.effect_type,
  target_key         = EXCLUDED.target_key,
  effect_value       = EXCLUDED.effect_value,
  conditions_json    = EXCLUDED.conditions_json;
