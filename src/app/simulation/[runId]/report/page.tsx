/**
 * Participant Report — /simulation/[runId]/report
 *
 * Print-friendly performance report a participant can save as a PDF using
 * the browser's "Save as PDF" print destination. Available only after the
 * simulation is fully completed (status === "completed", which means the
 * executive recommendation has been submitted).
 *
 * Auth: signed-in participant; the run's user_id must match the viewer.
 * Data: server-side only via the user-scoped Supabase client. Faculty
 * and admin viewers reach the equivalent report through a separate route
 * under /faculty (which uses the admin client to read across cohorts).
 */

import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/currentUser";
import { loadReportData } from "@/lib/report/loadReportData";
import ReportView from "@/components/report/ReportView";
import PrintButton from "@/components/report/PrintButton";

interface Props {
  params: { runId: string };
}

export const metadata: Metadata = {
  title: "BWXT Leadership Report",
};

export default async function ParticipantReportPage({ params }: Props) {
  const supabase = createClient();

  const { userId } = await requireCurrentUser(supabase);

  // Pre-check the run's status so we can route the user back to the right
  // place if the report isn't ready yet — loadReportData() returns null
  // for incomplete runs, which would be a bare 404 otherwise.
  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id")
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "not_started") {
    redirect(`/simulation/${run.id}/orientation`);
  }
  if (run.status !== "completed") {
    // Recommendation not yet submitted — push them back to finish.
    if (run.current_round_number < 4) {
      redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
    }
    redirect(`/simulation/${run.id}/recommendation`);
  }

  const data = await loadReportData(supabase, params.runId, {
    requireUserId: userId,
  });
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-bwxt-bg pb-12 print:bg-white print:pb-0">
      {/* Slim sub-toolbar (sits below the SimulationNav); hidden in print */}
      <div className="no-print bg-white border-b border-bwxt-border sticky top-14 z-[5]">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href={`/simulation/${data.runId}/complete`}
              className="text-[13px] text-bwxt-text-secondary hover:text-bwxt-navy focus:outline-none focus:ring-2 focus:ring-bwxt-navy rounded"
            >
              ← Back to Completion Summary
            </Link>
          </div>
          <PrintButton size="compact" />
        </div>
      </div>

      <main className="pt-6 print:pt-0">
        <ReportView data={data} />
      </main>

      {/* Bottom action area on screen — full hint repeated for clarity */}
      <div className="no-print max-w-[880px] mx-auto px-6 mt-8">
        <PrintButton />
      </div>
    </div>
  );
}
