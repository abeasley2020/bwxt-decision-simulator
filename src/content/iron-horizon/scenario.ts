/**
 * Operation Iron Horizon — Scenario Definition
 *
 * Top-level scenario and version metadata.
 * Content is authored here and loaded into the DB via seed.
 */

export const SCENARIO_KEY = "operation_iron_horizon";
export const SCENARIO_VERSION_LABEL = "v1.0";

export const SCENARIO_INTRO = `
You have just been named Acting President of BWXT's largest operating division.

The division generates $2.4B in annual revenue across defense manufacturing,
commercial nuclear services, and emerging government technology contracts.

You have 90 days to demonstrate executive leadership before the Board confirms
your appointment permanently.

The environment is complex:

- Defense contracts are under margin pressure from a competitor's recent bid
- A nuclear safety audit is scheduled in 60 days with potential compliance risk
- Your digital transformation program is 18 months behind schedule
- Two of your six direct reports are considered flight risks
- The Board is watching for decisive action

You will face three rounds of decisions, each with real consequences.
Your choices will be tracked, scored, and revealed at the end.

This is not a game. Lead accordingly.
`.trim();

export const SCENARIO_OUTRO = `
Your simulation is complete.

Your decisions have been scored across seven leadership dimensions.
Your KPI trajectory has been captured across all three rounds.
Your executive recommendation has been recorded.

Review your performance dashboard below.
Your profile and insights will be used in the live leadership academy session.
`.trim();

export const ESTIMATED_DURATION_MINUTES = 105;
