/**
 * Admin Participants — /admin/participants
 *
 * Lists all participants across all cohorts with their simulation status.
 * Placeholder — full filtering and export coming in a future slice.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === "completed")
    return { backgroundColor: "#D1FAE5", color: "#065F46" };
  if (status === "in_progress")
    return { backgroundColor: "#DBEAFE", color: "#1E3A8A" };
  return { backgroundColor: "#F3F4F6", color: "#6B7280" };
}

function statusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  if (status === "not_started") return "Not Started";
  return status;
}

export default async function AdminParticipantsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load all participant memberships with user info and latest run
  const { data: memberships } = await supabase
    .from("cohort_memberships")
    .select(
      `
      id,
      invitation_status,
      cohort_id,
      cohorts ( name ),
      users ( id, first_name, last_name, email )
    `
    )
    .eq("cohort_role", "participant")
    .order("created_at", { ascending: false });

  const memberList = memberships ?? [];

  // Load all simulation runs for these participants
  const userIds = Array.from(
    new Set(
      memberList
        .map((m) => (m.users as unknown as { id: string } | null)?.id)
        .filter(Boolean) as string[]
    )
  );

  const runsByUser: Record<string, { status: string }> = {};
  if (userIds.length > 0) {
    const { data: runs } = await supabase
      .from("simulation_runs")
      .select("user_id, status")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    for (const run of runs ?? []) {
      if (!runsByUser[run.user_id]) {
        runsByUser[run.user_id] = { status: run.status };
      }
    }
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 40px" }}>
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
          Participants
        </h1>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          All participants across cohorts.
        </p>
      </div>

      {memberList.length === 0 ? (
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
            No participants found.
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
            <caption className="sr-only">All participants with cohort and simulation status</caption>
            <thead>
              <tr style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #E0DFF0" }}>
                {["Name", "Email", "Cohort", "Invite Status", "Simulation"].map((col) => (
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
              {memberList.map((m) => {
                const u = m.users as unknown as {
                  id: string;
                  first_name: string | null;
                  last_name: string | null;
                  email: string;
                } | null;
                const cohort = m.cohorts as unknown as { name: string } | null;
                const fullName = u
                  ? [u.first_name, u.last_name].filter(Boolean).join(" ") || "—"
                  : "—";
                const run = u ? runsByUser[u.id] : undefined;
                const simStatus = run?.status ?? "not_started";

                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: "1px solid #F3F4F6" }}
                  >
                    <td
                      style={{
                        padding: "14px 20px",
                        fontWeight: 500,
                        color: "#17153A",
                      }}
                    >
                      {fullName}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#6B7280" }}>
                      {u?.email ?? "—"}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#374151" }}>
                      {cohort?.name ?? "—"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor:
                            m.invitation_status === "accepted"
                              ? "#D1FAE5"
                              : "#FEF3C7",
                          color:
                            m.invitation_status === "accepted"
                              ? "#065F46"
                              : "#92400E",
                          textTransform: "capitalize",
                        }}
                      >
                        {m.invitation_status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          ...statusBadgeStyle(simStatus),
                        }}
                      >
                        {statusLabel(simStatus)}
                      </span>
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
