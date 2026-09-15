/**
 * Helpers for Supabase embedded join results.
 *
 * PostgREST returns an embedded relation as an array in some shapes and as a
 * single object in others, even for a one-to-one foreign key. Pages that
 * assumed only one shape either crashed or silently rendered blanks when the
 * other shape came back. Normalise every embedded relation through firstOf.
 */

export function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
