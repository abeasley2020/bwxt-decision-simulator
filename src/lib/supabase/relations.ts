/**
 * Supabase embedded joins return an array for some one-to-one FK relationships
 * and a bare object for others, depending on how the relationship is inferred.
 * Normalise both shapes to a single record (or null).
 */

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
