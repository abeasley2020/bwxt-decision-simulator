/**
 * Shared handling for failed data access.
 *
 * Supabase returns errors in the result object rather than throwing, so an
 * ignored `error` field turns a failed query into an empty result. Two
 * policies are available:
 *
 *  - throwOnQueryError: for reads whose failure would silently produce wrong
 *    output, because an empty result is indistinguishable from "no rows"
 *    (profile assignment, report data, cohort resolution). The error bubbles
 *    to the API route or the nearest error boundary.
 *  - logQueryError: for reads that genuinely degrade to a default. Keeps the
 *    cause in the server log instead of discarding it, and reports whether
 *    the query failed so callers can branch.
 */

export interface QueryErrorLike {
  message: string;
  code?: string;
}

export class DataAccessError extends Error {
  readonly context: string;
  readonly code?: string;

  constructor(context: string, cause: QueryErrorLike) {
    super(`${context}: ${cause.message}`);
    this.name = "DataAccessError";
    this.context = context;
    this.code = cause.code;
  }
}

export function throwOnQueryError(
  context: string,
  error: QueryErrorLike | null | undefined
): void {
  if (!error) return;
  console.error(`[data] ${context} failed:`, error.message);
  throw new DataAccessError(context, error);
}

/** Returns true when the query failed. */
export function logQueryError(
  context: string,
  error: QueryErrorLike | null | undefined
): boolean {
  if (!error) return false;
  console.error(`[data] ${context} failed:`, error.message);
  return true;
}
