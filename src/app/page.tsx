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

  // Route users to their role-appropriate home
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (userRow?.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (userRow?.role === "faculty") {
    redirect("/faculty/dashboard");
  }

  redirect("/simulation");
}
