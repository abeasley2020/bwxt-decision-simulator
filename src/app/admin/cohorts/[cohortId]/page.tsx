/**
 * Cohort Management — /admin/cohorts/[cohortId]
 *
 * Shows full cohort details, status controls, participant table with invite
 * form, faculty table with invite form, and a link to the readiness page.
 *
 * Access control: admin only.
 *
 * WCAG: h1→h2 heading hierarchy; tables with caption + th scope; status
 * badges use text + color; section landmarks with aria-labelledby;
 * all interactive elements keyboard accessible.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusControls from "./StatusControls";
import InviteForm from "./InviteForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDatetime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type MemberRow = {
  user_id: string;
  invitation_status: string;
  users: Array<{ id: string; first_name: string; last_name: string; email: string }>;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CohortManagePage({
  params,
}: {
  params: { cohortId: string };
}) {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role !== "admin") {
    redirect(userRow?.role === "faculty" ? "/faculty/dashboard" : "/simulation");
  }

  // ── Load cohort ──────────────────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select(
      "id, name, description, status, academy_start_date, academy_end_date, simulator_deadline, scenario_version_id"
    )
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) notFound();

  // ── Load related data in parallel ─────────────────────────────────────────

  const [scenarioVersionRes, participantMembershipsRes, facultyMembershipsRes] =
    await Promise.all([
      supabase
        .from("scenario_versions")
        .select("version_label, scenarios(title)")
        .eq("id", cohort.scenario_version_id)
        .maybeSingle(),
      supabase
        .from("cohort_memberships")
        .select("user_id, invitation_status, users(id, first_name, last_name, email)")
        .eq("cohort_id", params.cohortId)
        .eq("cohort_role", "participant"),
      supabase
        .from("cohort_memberships")
        .select("user_id, invitation_status, users(id, first_name, last_name, email)")
        .eq("cohort_id", params.cohortId)
        .eq("cohort_role", "faculty"),
    ]);

  // ── Load simulation runs for participant status ────────────────────────────

  const participantIds = (participantMembershipsRes.data as MemberRow[] ?? []).map(
    (m) => m.user_id
  );

  const { data: runsData } =
    participantIds.length > 0
      ? await supabase
          .from("simulation_runs")
          .select("user_id, status, completed_at")
          .eq("cohort_id", params.cohortId)
          .in("user_id", participantIds)
      : { data: [] };

  const runsByUser = new Map(
    (runsData ?? []).map((r: { user_id: string; status: string; completed_at: string | null }) => [
      r.user_id,
      r,
    ])
  );

  // ── Build display data ────────────────────────────────────────────────────

  const participants = (participantMembershipsRes.data as MemberRow[] ?? []).map((m) => {
    const u = m.users[0] ?? null;
    const run = runsByUser.get(m.user_id);
    const simStatus: string = run?.status ?? "not_started";
    return {
      userId: m.user_id,
      name: u ? `${u.first_name} ${u.last_name}`.trim() : "Unknown",
      email: u?.email ?? "—",
      simStatus,
      completedAt: run?.completed_at ?? null,
    };
  });

  const faculty = (facultyMembershipsRes.data as MemberRow[] ?? []).map((m) => {
    const u = m.users[0] ?? null;
    return {
      userId: m.user_id,
      name: u ? `${u.first_name} ${u.last_name}`.trim() : "Unknown",
      email: u?.email ?? "—",
      invitationStatus: m.invitation_status,
    };
  });

  // ── Scenario version label ────────────────────────────────────────────────

  const sv = scenarioVersionRes.data;
  const scenarioTitle = sv
    ? Array.isArray(sv.scenarios)
      ? (sv.scenarios[0] as { title: string } | undefined)?.title
      : (sv.scenarios as { title: string } | null)?.title
    : null;
  const versionLabel = sv
    ? `${scenarioTitle ? `${scenarioTitle} — ` : ""}${sv.version_label}`
    : "Unknown";

  const cohortStatus = cohort.status as "draft" | "active" | "closed";

  const statusBadgeClass =
    cohortStatus === "active"
      ? "bg-green-100 text-green-800"
      : cohortStatus === "closed"
      ? "bg-gray-100 text-gray-600"
      : "bg-yellow-100 text-yellow-800";

  const statusText =
    cohortStatus === "active"
      ? "Active"
      : cohortStatus === "closed"
      ? "Closed"
      : "Draft";

  const simStatusLabel: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    not_started: "Not Started",
  };
  const simStatusClass: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    not_started: "bg-gray-100 text-gray-600",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* ── Back link ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← All Cohorts
        </Link>
      </div>

      {/* ── Cohort details card ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            {/* Heading + status badge */}
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-brand-navy">
                {cohort.name}
              </h1>
              <span
                className={`
                  text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide
                  ${statusBadgeClass}
                `}
                aria-label={`Status: ${statusText}`}
              >
                {/* Text label — not color alone — satisfies WCAG 1.4.1 */}
                {statusText}
              </span>
            </div>

            {cohort.description && (
              <p className="text-gray-500 text-sm mb-3">{cohort.description}</p>
            )}

            {/* Details grid */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-3">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Academy Start
                </dt>
                <dd className="font-medium text-gray-800">
                  {formatDate(cohort.academy_start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Academy End
                </dt>
                <dd className="font-medium text-gray-800">
                  {formatDate(cohort.academy_end_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Simulator Deadline
                </dt>
                <dd className="font-medium text-gray-800 text-xs">
                  {formatDatetime(cohort.simulator_deadline)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Scenario
                </dt>
                <dd className="font-medium text-gray-800 text-xs">
                  {versionLabel}
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href={`/admin/cohorts/${cohort.id}/edit`}
            className="
              px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md
              hover:border-gray-400 transition-colors shrink-0
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
            "
          >
            Edit Details
          </Link>
        </div>

        {/* Status controls */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Cohort Status
          </h2>
          <StatusControls cohortId={cohort.id} currentStatus={cohortStatus} />
        </div>
      </div>

      {/* ── Readiness link ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={`/admin/cohorts/${cohort.id}/readiness`}
          className="
            block bg-white border border-gray-200 rounded-xl p-5
            hover:border-brand-blue hover:shadow-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          "
        >
          <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-1">
            Analytics
          </div>
          <div className="text-brand-navy font-bold text-lg mb-1">
            Participant Readiness
          </div>
          <p className="text-gray-500 text-sm">
            View completion status and highlight participants at risk of missing
            the simulator deadline.
          </p>
        </Link>
      </div>

      {/* ── Participants ─────────────────────────────────────────────────── */}
      <section aria-labelledby="participants-heading" className="mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
            <h2
              id="participants-heading"
              className="text-base font-bold text-brand-navy"
            >
              Participants
              <span className="ml-2 text-gray-400 font-normal text-sm">
                ({participants.length})
              </span>
            </h2>
          </div>

          {participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <caption className="sr-only">
                  Participants assigned to {cohort.name}
                </caption>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Simulation
                    </th>
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((p) => (
                    <tr key={p.userId} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-brand-navy">
                        {p.name}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {p.email}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`
                            inline-block text-xs font-semibold px-2 py-0.5 rounded-full
                            ${simStatusClass[p.simStatus] ?? "bg-gray-100 text-gray-600"}
                          `}
                        >
                          {simStatusLabel[p.simStatus] ?? p.simStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs tabular-nums">
                        {p.completedAt
                          ? new Date(p.completedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No participants assigned yet.
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100">
            <InviteForm cohortId={cohort.id} inviteeRole="participant" />
          </div>
        </div>
      </section>

      {/* ── Faculty ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="faculty-heading" className="mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2
              id="faculty-heading"
              className="text-base font-bold text-brand-navy"
            >
              Faculty
              <span className="ml-2 text-gray-400 font-normal text-sm">
                ({faculty.length})
              </span>
            </h2>
          </div>

          {faculty.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <caption className="sr-only">
                  Faculty assigned to {cohort.name}
                </caption>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {faculty.map((f) => (
                    <tr key={f.userId} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-brand-navy">
                        {f.name}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {f.email}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`
                            inline-block text-xs font-semibold px-2 py-0.5 rounded-full
                            ${
                              f.invitationStatus === "accepted"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          `}
                        >
                          {f.invitationStatus === "accepted"
                            ? "Accepted"
                            : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              No faculty assigned yet.
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100">
            <InviteForm cohortId={cohort.id} inviteeRole="faculty" />
          </div>
        </div>
      </section>
    </main>
  );
}
