/**
 * Display-name formatting for public.users rows.
 */

export interface NameParts {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/**
 * "First Last", falling back to the email address, then to `fallback`.
 */
export function formatFullName(
  user: NameParts | null | undefined,
  fallback = "\u2014"
): string {
  const parts = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return parts || user?.email || fallback;
}
