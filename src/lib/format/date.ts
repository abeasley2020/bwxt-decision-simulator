/**
 * Shared en-US date formatting used across admin, faculty, and participant
 * surfaces. Empty values render as a dash placeholder unless overridden.
 */

function format(
  value: string | null | undefined,
  month: "long" | "short",
  fallback: string
): string {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "March 4, 2026" */
export function formatLongDate(
  value: string | null | undefined,
  fallback = "\u2014"
): string {
  return format(value, "long", fallback);
}

/** e.g. "Mar 4, 2026" */
export function formatShortDate(
  value: string | null | undefined,
  fallback = "\u2014"
): string {
  return format(value, "short", fallback);
}
