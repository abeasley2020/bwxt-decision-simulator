/**
 * Admin Report — /admin/participants/[userId]/report
 *
 * Admin-only access to any participant's full performance report,
 * regardless of the admin's own cohort memberships. Mirrors the faculty
 * route but skips the cohort gate (admins see all cohorts).
 *
 * Run selection: picks the participant's most recently completed run.
 * If no completed run exists, renders a friendly empty state.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminViewer } from "@/lib/auth/roleGuards";
import { loadReportData } from "@/lib/report/loadReportData";
import ReportView from "@/components/report/ReportView";
import PrintButton from "@/components/report/PrintButton";

interface Props {
  params: { userId: string };
}

export const metadata: Metadata = {
  title: "BWXT Leadership Report",
};

export default async function AdminReportPage({ params }: Props) {
  const supabase = createClient();

  await requireAdminViewer(supabase);

  // Cross-cohort data reads — use the admin client per the established pattern
  const admin = createAdminClient();

  // Most recently completed run (across any cohort) for this participant
  const { data: latestRun } = await admin
    .from("simulation_runs")
    .select("id, completed_at")
    .eq("user_id", params.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve participant identity for the empty-state header
  const { data: participantUser } = await admin
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", params.userId)
    .maybeSingle();

  if (!participantUser) notFound();

  const fullName =
    [participantUser.first_name, participantUser.last_name]
      .filter(Boolean)
      .join(" ") || participantUser.email;

  if (!latestRun) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/admin/participants"
          className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy"
        >
          ← Back to Participants
        </Link>
        <div className="mt-6 bg-white border border-bwxt-border rounded-xl p-10 text-center">
          <h1 className="text-bwxt-navy font-bold text-lg mb-2">{fullName}</h1>
          <p className="text-bwxt-text-muted text-[14px]">
            No completed simulation run on file. The full report becomes
            available once this participant submits their executive
            recommendation.
          </p>
        </div>
      </main>
    );
  }

  const reportData = await loadReportData(admin, latestRun.id);
  if (!reportData) notFound();

  return (
    <div className="min-h-screen bg-bwxt-bg pb-12 print:bg-white print:pb-0">
      {/* Slim sub-toolbar (sits below the AdminNav); hidden in print */}
      <div className="no-print bg-white border-b border-bwxt-border sticky top-14 z-[5]">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/admin/participants"
            className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy focus:outline-none focus:ring-2 focus:ring-bwxt-navy rounded"
          >
            ← Back to Participants
          </Link>
          <PrintButton size="compact" />
        </div>
      </div>

      <main className="pt-6 print:pt-0">
        <ReportView data={reportData} />
      </main>

      <div className="no-print max-w-[880px] mx-auto px-6 mt-8">
        <PrintButton />
      </div>
    </div>
  );
}
