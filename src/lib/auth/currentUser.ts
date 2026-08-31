/**
 * Current-user resolution helpers.
 *
 * Every authenticated surface needs the same two steps: read the Supabase
 * auth user, then resolve the matching public.users row by email (auth.users.id
 * and public.users.id are not guaranteed to match for accounts provisioned
 * before the invite-flow fix). These helpers centralise that pattern so pages
 * and API routes do not each re-implement it.
 */

import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type UserRole = "admin" | "faculty" | "participant";

export interface CurrentUser<TRow = Record<string, unknown>> {
  /** auth.users record */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authUser: any;
  email: string;
  /** public.users row, or null when no row matches the auth email */
  publicUser: TRow | null;
  /** public.users.id when resolvable, otherwise the auth id */
  userId: string;
  role: UserRole | null;
}

/**
 * Resolves the auth user plus its public.users row. Returns null when there is
 * no authenticated session, so callers can choose their own failure mode
 * (redirect for pages, 401 JSON for API routes).
 *
 * `columns` is appended to the always-selected `id, role`.
 */
export async function getCurrentUser<TRow = Record<string, unknown>>(
  supabase: SupabaseLike,
  columns?: string
): Promise<CurrentUser<TRow> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const select = ["id", "role", ...(columns ? [columns] : [])].join(", ");

  const { data: publicUser } = await supabase
    .from("users")
    .select(select)
    .eq("email", user.email!)
    .maybeSingle();

  return {
    authUser: user,
    email: user.email!,
    publicUser: (publicUser as TRow) ?? null,
    userId: (publicUser?.id as string | undefined) ?? user.id,
    role: (publicUser?.role as UserRole | undefined) ?? null,
  };
}

/**
 * Page variant: redirects to /login when unauthenticated.
 */
export async function requireCurrentUser<TRow = Record<string, unknown>>(
  supabase: SupabaseLike,
  columns?: string
): Promise<CurrentUser<TRow>> {
  const current = await getCurrentUser<TRow>(supabase, columns);
  if (!current) redirect("/login");
  return current;
}

/** Landing route for a role, used after login and by role guards. */
export function homePathForRole(role: UserRole | null | undefined): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "faculty") return "/faculty/dashboard";
  return "/simulation";
}
