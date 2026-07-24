/**
 * Faculty/Admin Report — /faculty/participants/[userId]/report
 *
 * Print-friendly performance report for a participant, accessible to faculty
 * and admin viewers within the same cohort. The participant must have
 * completed the simulation (status === "completed").
 *
 * Auth flow:
 *  1. Authenticate (redirect to /login if anonymous)
 *  2. Role guard: participants are bounced to /simulation
 *  3. Verify the target user is a participant in the viewer's active cohort
 *  4. Load report data using the admin client — RLS on `users` blocks the
 *     user-scoped client from reading other participants' rows, per the
 *     pattern established in earlier admin/faculty pages.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveFacultyCohort } from "@/lib/faculty/getActiveFacultyCohort";
import { requireFacultyViewer } from "@/lib/auth/roleGuards";
import { loadReportData } from "@/lib/report/loadReportData";
import ReportView from "@/components/report/ReportView";
import PrintButton from "@/components/report/PrintButton";

interface Props {
  params: { userId: string };
}

export const metadata: Metadata = {
  title: "BWXT Leadership Report",
};

export default async function FacultyReportPage({ params }: Props) {
  const supabase = createClient();

  const viewer = await requireFacultyViewer(supabase);

  // Active faculty cohort
  const cohort = await getActiveFacultyCohort(supabase, viewer.userId);
  if (!cohort) notFound();

  // Membership check: target user must be a participant in this cohort
  const { data: membership } = await supabase
    .from("cohort_memberships")
    .select("user_id")
    .eq("cohort_id", cohort.id)
    .eq("user_id", params.userId)
    .eq("cohort_role", "participant")
    .maybeSingle();

  if (!membership) notFound();

  // Use admin client for cross-user data reads (RLS blocks user-scoped
  // client on `users` for other participants).
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("simulation_runs")
    .select("id, status")
    .eq("cohort_id", cohort.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (!run) {
    // Fall back to a friendly empty state rather than a hard 404 — the
    // viewer arrived from the participant detail page expecting *some*
    // content.
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href={`/faculty/participants/${params.userId}`}
          className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy"
        >
          ← Back to Participant Detail
        </Link>
        <div className="mt-6 bg-white border border-bwxt-border rounded-xl p-10 text-center">
          <p className="text-bwxt-text-muted text-[14px]">
            This participant has not started the simulation yet.
          </p>
        </div>
      </main>
    );
  }

  if (run.status !== "completed") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href={`/faculty/participants/${params.userId}`}
          className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy"
        >
          ← Back to Participant Detail
        </Link>
        <div className="mt-6 bg-white border border-bwxt-border rounded-xl p-10 text-center">
          <p className="text-bwxt-text-muted text-[14px]">
            The full report becomes available after this participant completes
            the simulation, including the executive recommendation.
          </p>
        </div>
      </main>
    );
  }

  const reportData = await loadReportData(admin, run.id);
  if (!reportData) notFound();

  return (
    <div className="min-h-screen bg-bwxt-bg pb-12 print:bg-white print:pb-0">
      {/* Slim header on screen with action buttons; hidden in print */}
      <div className="no-print bg-white border-b border-bwxt-border sticky top-0 z-10">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href={`/faculty/participants/${params.userId}`}
            className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy focus:outline-none focus:ring-2 focus:ring-bwxt-navy rounded"
          >
            ← Back to Participant Detail
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
