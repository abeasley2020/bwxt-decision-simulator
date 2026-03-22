/**
 * Operation Iron Horizon — Main Export
 *
 * Assembles the full scenario version for use by the engine and DB seed.
 */

import type { ScenarioVersion } from "@/engine/types";
import {
  SCENARIO_KEY,
  SCENARIO_VERSION_LABEL,
  SCENARIO_INTRO,
  SCENARIO_OUTRO,
  ESTIMATED_DURATION_MINUTES,
} from "./scenario";
import round1 from "./rounds/round-1";
import round2 from "./rounds/round-2";
import round3 from "./rounds/round-3";

export { PERFORMANCE_PROFILES } from "./profiles";
export { SCENARIO_KEY };

export const IRON_HORIZON_VERSION: ScenarioVersion = {
  id: "iron-horizon-v1", // placeholder — replaced by DB uuid after seed
  versionLabel: SCENARIO_VERSION_LABEL,
  introContent: SCENARIO_INTRO,
  outroContent: SCENARIO_OUTRO,
  estimatedDurationMinutes: ESTIMATED_DURATION_MINUTES,
  rounds: [round1, round2, round3],
};
