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

  // Route faculty and admin to their dashboard; participants to simulation
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (userRow?.role === "faculty" || userRow?.role === "admin") {
    redirect("/faculty/dashboard");
  }

  redirect("/simulation");
}
