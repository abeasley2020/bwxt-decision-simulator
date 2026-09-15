/**
 * Resolves the `public.users` row for an authenticated Supabase user.
 *
 * `auth.users.id` and `public.users.id` are not the same for accounts
 * provisioned before the invite-flow fix, so every surface must resolve by
 * email first and fall back to the auth id. Participant pages already did
 * this inline; admin and faculty surfaces used the auth id alone, which
 * fails closed (403 or redirect) for those legacy accounts.
 *
 * Returns null when no matching row exists. Callers decide whether that is
 * a redirect to /login or a 401/403.
 */

export type PublicUserRole = "participant" | "faculty" | "admin";

export interface PublicUserIdentity {
  id: string;
  role: PublicUserRole;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface AuthUserLike {
  id: string;
  email?: string | null;
}

export async function resolvePublicUser(
  supabase: SupabaseLike,
  authUser: AuthUserLike | null | undefined
): Promise<PublicUserIdentity | null> {
  if (!authUser) return null;

  if (authUser.email) {
    const { data } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", authUser.email)
      .maybeSingle();

    if (data) {
      return { id: data.id as string, role: data.role as PublicUserRole };
    }
  }

  const { data: byId } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (byId) {
    return { id: byId.id as string, role: byId.role as PublicUserRole };
  }

  return null;
}

/** True when the role may view faculty surfaces (allow-list, not deny-list). */
export function isFacultyOrAdmin(role: PublicUserRole | null | undefined): boolean {
  return role === "faculty" || role === "admin";
}
