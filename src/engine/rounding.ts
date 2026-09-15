/**
 * Numeric rounding for engine state.
 *
 * Pure function. No side effects, no UI dependencies.
 *
 * Resource-allocation effects scale an authored integer effect value by
 * allocationPercent / 100, so intended values land on at most two decimal
 * places (15 * 0.35 = 5.25). Binary floating point cannot represent those
 * exactly, and the error accumulates across the twelve decisions: a score
 * that should read 0 arrives as -0.019999999999999574, and a KPI that
 * should read 80.2 arrives as 80.20000000000002. Those raw values were
 * rendered straight to participants and written into aria-valuenow.
 *
 * Rounding to two decimals after every delta removes the representation
 * error while preserving every value the content layer can actually
 * produce, so persisted state stays canonical and deterministic and
 * profile thresholds compare against the intended numbers.
 */
const PRECISION = 2;

export function roundValue(value: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}
