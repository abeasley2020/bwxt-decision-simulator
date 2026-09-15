/**
 * Root redirect
 * Middleware handles auth-based routing.
 * Authenticated users land here and are redirected to their role-appropriate home.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicUser } from "@/lib/auth/resolvePublicUser";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Route users to their role-appropriate home. Resolve public.users by email
  // first: auth.users.id and public.users.id differ for legacy accounts, and
  // an id-only lookup silently routed admins and faculty to /simulation.
  const viewer = await resolvePublicUser(supabase, user);

  if (viewer?.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (viewer?.role === "faculty") {
    redirect("/faculty/dashboard");
  }

  redirect("/simulation");
}
