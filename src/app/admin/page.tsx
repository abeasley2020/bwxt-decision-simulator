/**
 * Admin Overview — /admin
 *
 * Landing page for the admin section. Summarises cohort and participant
 * activity at a glance. Placeholder content until analytics are wired up.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quick stats
  const [cohortsRes, participantsRes, completedRes] = await Promise.all([
    supabase.from("cohorts").select("id", { count: "exact", head: true }),
    supabase
      .from("cohort_memberships")
      .select("id", { count: "exact", head: true })
      .eq("cohort_role", "participant"),
    supabase
      .from("simulation_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  const cohortCount = cohortsRes.count ?? 0;
  const participantCount = participantsRes.count ?? 0;
  const completedCount = completedRes.count ?? 0;

  const stats = [
    { label: "Total Cohorts",        value: cohortCount },
    { label: "Total Participants",   value: participantCount },
    { label: "Simulations Complete", value: completedCount },
  ];

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 40px" }}>
      {/* Page heading */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "24px",
            color: "#17153A",
            marginBottom: "6px",
          }}
        >
          Overview
        </h1>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          High-level activity across all cohorts and participants.
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #E0DFF0",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6B7280",
                marginBottom: "10px",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "36px",
                color: "#17153A",
                lineHeight: 1,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #E0DFF0",
          borderRadius: "12px",
          padding: "24px 28px",
        }}
      >
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            color: "#17153A",
            marginBottom: "16px",
          }}
        >
          Quick Actions
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { label: "Manage Cohorts",      href: "/admin/cohorts"      },
            { label: "View Participants",   href: "/admin/participants" },
            { label: "Scenario Library",    href: "/admin/scenarios"    },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "inline-block",
                padding: "8px 18px",
                backgroundColor: "#17153A",
                color: "#ffffff",
                borderRadius: "8px",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
