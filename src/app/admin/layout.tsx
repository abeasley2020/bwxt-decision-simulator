/**
 * Admin layout — server component.
 *
 * Responsibilities:
 *  - Authenticate the session (redirect /login if unauthenticated)
 *  - Role guard: non-admin users are redirected to their home route
 *  - Resolve display name from public.users and pass to AdminNav
 *  - Render AdminNav + page content
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve public.users by email (handles ID mismatch for older accounts)
  const { data: publicUser } = await supabase
    .from("users")
    .select("id, role, first_name, last_name")
    .eq("email", user.email!)
    .maybeSingle();

  if (!publicUser) redirect("/login");

  // Role guard
  if (publicUser.role === "faculty") redirect("/faculty/dashboard");
  if (publicUser.role === "participant") redirect("/simulation");

  const firstName = publicUser.first_name ?? "";
  const lastName = publicUser.last_name ?? "";
  const userName = [firstName, lastName].filter(Boolean).join(" ") || user.email!;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F4F7" }}>
      <AdminNav userName={userName} />
      {children}
    </div>
  );
}
