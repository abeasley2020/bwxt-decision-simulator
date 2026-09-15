/**
 * Operation Iron Horizon: Scenario Definition
 *
 * Top-level scenario and version metadata, plus every piece of orientation
 * copy the participant reads before Round 1.
 *
 * Content is authored here and nowhere else. The orientation page renders
 * from these exports; it must not restate any of this prose inline. Before
 * 2026-09-15 it did, and the two copies drifted: the page heading read
 * "BWXT Nuclear Division" while the narrative directly beneath it read
 * "BWXT's largest operating division". The narrative wording is the
 * authoritative one, for three reasons: it is what the content layer and the
 * DB seed's intro_content have always said, it is what the sentence under the
 * heading says so the page contradicted itself, and BWXT's real operating
 * segments are Government Operations and Commercial Operations, so naming a
 * "Nuclear Division" invents a business unit the client does not have. The
 * scenario deliberately uses a generic descriptor instead.
 *
 * Note on em dashes: per CLAUDE.md they are banned in comments and docs, and
 * permitted only inside participant-facing scenario prose, which is quoted
 * verbatim from the authored source.
 */

export const SCENARIO_KEY = "operation_iron_horizon";
export const SCENARIO_VERSION_LABEL = "v1.0";

export const SCENARIO_TITLE = "Operation Iron Horizon";

/** Sits under the title in the orientation hero. */
export const SCENARIO_SUBTITLE =
  "Executive Decision Simulation — Leadership Assessment";

/** The participant's role. Rendered as the scenario brief heading. */
export const SCENARIO_ROLE_TITLE =
  "Acting President, BWXT's Largest Operating Division";

/** One-line framing under the role title. */
export const SCENARIO_ROLE_TAGLINE =
  "90-Day Mandate. Three Rounds. Real Consequences.";

/**
 * The Situation Brief narrative, one entry per rendered paragraph.
 * SCENARIO_INTRO is assembled from this below, so the two cannot drift.
 */
export const SCENARIO_BRIEF_PARAGRAPHS: readonly string[] = [
  "You have just been named Acting President of BWXT's largest operating division. The division generates $2.4B in annual revenue across defense manufacturing, commercial nuclear services, and emerging government technology contracts.",
  "You have 90 days to demonstrate executive leadership before the Board confirms your appointment permanently.",
  "You will face three rounds of decisions, each with real consequences. Your choices will be tracked, scored, and revealed at the end. This is not a game. Lead accordingly.",
] as const;

export interface ScenarioChallenge {
  /** Short uppercase eyebrow label, for example "Compliance Risk". */
  category: string;
  /** Card heading. */
  title: string;
  /** One or two sentences of detail. */
  body: string;
}

/**
 * The four opening pressures, rendered as cards inside the Situation Brief.
 * These are the same five-bullet "environment is complex" list that used to
 * live only in SCENARIO_INTRO, minus "The Board is watching for decisive
 * action", which is framing rather than a discrete challenge and is carried
 * by SCENARIO_ROLE_TAGLINE instead.
 */
export const SCENARIO_CHALLENGES: readonly ScenarioChallenge[] = [
  {
    category: "Contract Margin",
    title: "Defense Margin Pressure",
    body: "A competitor's recent bid has placed BWXT's core defense contracts under significant margin pressure.",
  },
  {
    category: "Compliance Risk",
    title: "Nuclear Safety Audit",
    body: "A mandatory safety audit is scheduled in 60 days. Potential compliance exposure has not yet been resolved.",
  },
  {
    category: "Execution Lag",
    title: "Digital Transformation",
    body: "The division's digital transformation program is running 18 months behind its original delivery schedule.",
  },
  {
    category: "Talent Retention",
    title: "Direct Report Flight Risk",
    body: "Two of your six direct reports are considered flight risks and may require immediate attention.",
  },
] as const;

/** The "Before You Begin" checklist on the orientation page. */
export const SCENARIO_PREFLIGHT_NOTES: readonly string[] = [
  "You will face three rounds of decisions, each with real consequences.",
  "Your decisions are logged and cannot be changed once submitted.",
  "Write your rationale thoughtfully — it signals how you think, not just what you choose.",
  "You can pause and return at any time. Your progress is saved automatically.",
] as const;

/**
 * Flat prose form of the brief. Used for the DB seed's
 * scenario_versions.intro_content and anywhere a single string is needed.
 * Derived, never hand-edited.
 */
export const SCENARIO_INTRO = [
  SCENARIO_BRIEF_PARAGRAPHS[0],
  "",
  SCENARIO_BRIEF_PARAGRAPHS[1],
  "",
  "The environment is complex:",
  "",
  ...SCENARIO_CHALLENGES.map((c) => `- ${c.title}: ${c.body}`),
  "",
  SCENARIO_BRIEF_PARAGRAPHS[2],
].join("\n");

export const SCENARIO_OUTRO = `
Your simulation is complete.

Your decisions have been scored across seven leadership dimensions.
Your KPI trajectory has been captured across all three rounds.
Your executive recommendation has been recorded.

Review your performance dashboard below.
Your profile and insights will be used in the live leadership academy session.
`.trim();

export const ESTIMATED_DURATION_MINUTES = 105;
