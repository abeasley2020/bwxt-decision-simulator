/**
 * Role gates shared by the /faculty and /admin surfaces.
 *
 * Both resolve the viewer through the standard email-first lookup and send
 * anyone without the required role to their own home route.
 */

import { redirect } from "next/navigation";
import {
  homePathForRole,
  requireCurrentUser,
  type CurrentUser,
} from "@/lib/auth/currentUser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/** Faculty and admin viewers allowed; participants redirected away. */
export async function requireFacultyViewer<TRow = Record<string, unknown>>(
  supabase: SupabaseLike,
  columns?: string
): Promise<CurrentUser<TRow>> {
  const viewer = await requireCurrentUser<TRow>(supabase, columns);
  if (!viewer.publicUser || viewer.role === "participant") {
    redirect("/simulation");
  }
  return viewer;
}

/** Admin viewers only. */
export async function requireAdminViewer<TRow = Record<string, unknown>>(
  supabase: SupabaseLike,
  columns?: string
): Promise<CurrentUser<TRow>> {
  const viewer = await requireCurrentUser<TRow>(supabase, columns);
  if (!viewer.publicUser) redirect("/login");
  if (viewer.role !== "admin") redirect(homePathForRole(viewer.role));
  return viewer;
}
