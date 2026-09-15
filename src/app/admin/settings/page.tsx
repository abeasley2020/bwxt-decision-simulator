/**
 * Admin Settings — /admin/settings
 *
 * Placeholder for system configuration.
 * Content and form controls will be added in a future slice.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolvePublicUser } from "@/lib/auth/resolvePublicUser";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role gate. App Router layouts do not re-render on client-side navigation,
  // so the admin layout is not an authorization boundary; check here too.
  const viewer = await resolvePublicUser(supabase, user);
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") {
    redirect(viewer.role === "faculty" ? "/faculty/dashboard" : "/simulation");
  }

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 40px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "24px",
            color: "#17153A",
            marginBottom: "6px",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          System configuration and administrator preferences.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #E0DFF0",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "15px",
            color: "#9CA3AF",
          }}
        >
          Settings controls will appear here in a future release.
        </p>
      </div>
    </main>
  );
}
