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
import { requireCurrentUser } from "@/lib/auth/currentUser";
import { formatFullName } from "@/lib/format/name";
import AdminNav from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const { publicUser, role, email } = await requireCurrentUser<{
    first_name: string | null;
    last_name: string | null;
  }>(supabase, "first_name, last_name");

  if (!publicUser) redirect("/login");

  // Role guard
  if (role === "faculty") redirect("/faculty/dashboard");
  if (role === "participant") redirect("/simulation");

  const userName = formatFullName({ ...publicUser, email }, email);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F4F7" }}>
      <AdminNav userName={userName} />
      {children}
    </div>
  );
}
