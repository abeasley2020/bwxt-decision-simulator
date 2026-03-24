/**
 * Admin Scenarios — /admin/scenarios
 *
 * Library of authored simulation scenarios with version and status info.
 * Placeholder — scenario authoring tools coming in a future slice.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminScenariosPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: versions } = await supabase
    .from("scenario_versions")
    .select("id, version_label, is_active, created_at, scenarios ( title )")
    .order("created_at", { ascending: false });

  const versionList = versions ?? [];

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 40px" }}>
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
          Scenarios
        </h1>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          Authored simulation scenarios and their published versions.
        </p>
      </div>

      {versionList.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #E0DFF0",
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
            No scenario versions found.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #E0DFF0",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <caption className="sr-only">Scenario versions with title, tag, and publish status</caption>
            <thead>
              <tr style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #E0DFF0" }}>
                {["Scenario", "Version", "Status", "Created"].map((col) => (
                  <th
                    key={col}
                    scope="col"
                    style={{
                      textAlign: "left",
                      padding: "12px 20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "#6B7280",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versionList.map((v) => {
                const scenario = v.scenarios as unknown as { title: string } | null;
                return (
                  <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: 500,
                        color: "#17153A",
                      }}
                    >
                      {scenario?.title ?? "Untitled"}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#374151", fontFamily: "monospace", fontSize: "13px" }}>
                      {v.version_label}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: v.is_active ? "#D1FAE5" : "#F3F4F6",
                          color: v.is_active ? "#065F46" : "#6B7280",
                        }}
                      >
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", color: "#6B7280" }}>
                      {new Date(v.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
