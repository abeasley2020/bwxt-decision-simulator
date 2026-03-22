/**
 * Root redirect
 * Middleware handles auth-based routing.
 * Authenticated users land here and are redirected to their role-appropriate home.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Role-based redirect is handled by individual dashboards
  redirect("/simulation");
}
