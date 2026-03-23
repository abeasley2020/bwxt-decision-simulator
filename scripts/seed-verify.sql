-- BWXT Enterprise Decision Simulator — Round 1 Seed Verification
-- Run this after scripts/seed.sql to confirm expected row counts.
--
-- Expected results:
--   scenario_rounds:        1
--   decision_templates:     4
--   decision_options:      15
--   decision_effect_rules: 54

SELECT count(*) AS scenario_rounds_count
FROM scenario_rounds
WHERE scenario_version_id = '20000000-0000-0000-0000-000000000001';

SELECT count(*) AS decision_templates_count
FROM decision_templates
WHERE scenario_round_id = '30000000-0000-0000-0000-000000000001';

SELECT count(*) AS decision_options_count
FROM decision_options
WHERE decision_template_id IN (
  SELECT id FROM decision_templates
  WHERE scenario_round_id = '30000000-0000-0000-0000-000000000001'
);

SELECT count(*) AS decision_effect_rules_count
FROM decision_effect_rules
WHERE decision_option_id IN (
  SELECT id FROM decision_options
  WHERE decision_template_id IN (
    SELECT id FROM decision_templates
    WHERE scenario_round_id = '30000000-0000-0000-0000-000000000001'
  )
);
