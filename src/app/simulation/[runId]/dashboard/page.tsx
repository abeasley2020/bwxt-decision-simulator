/**
 * Participant performance dashboard — shown after completion.
 * Placeholder layout — charts and full profile reveal in Slice 3.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: { runId: string };
}

export default async function ParticipantDashboardPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, user_id, final_profile_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();
  if (run.status !== "completed") redirect(`/simulation/${run.id}/orientation`);

  return (
    <main className="min-h-screen bg-brand-light">
      <div className="bg-brand-navy text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold">Operation Iron Horizon — Results</span>
          <span className="text-white/40 text-sm">BWXT Leadership Academy</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-brand-navy mb-2">
          Your Performance Dashboard
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Your simulation is complete. Review your KPI trajectory, leadership
          scores, and executive profile below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* KPI summary — placeholder */}
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-brand-navy mb-4">KPI Trajectory</h2>
            <div className="h-48 bg-gray-50 rounded-md flex items-center justify-center text-gray-400 text-sm">
              [Chart placeholder — KPI trends across rounds]
            </div>
          </div>

          {/* Profile card — placeholder */}
          <div className="bg-brand-navy text-white rounded-lg p-6">
            <div className="text-brand-gold text-xs font-semibold uppercase tracking-wide mb-2">
              Your Profile
            </div>
            <div className="text-xl font-bold mb-3">
              [Profile name placeholder]
            </div>
            <p className="text-white/60 text-sm">
              [Profile description and strengths/blind spots will display here after Slice 3]
            </p>
          </div>
        </div>

        {/* Score breakdown — placeholder */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-brand-navy mb-4">
            Leadership Score Breakdown
          </h2>
          <div className="h-32 bg-gray-50 rounded-md flex items-center justify-center text-gray-400 text-sm">
            [Score bars across 7 dimensions — Slice 3]
          </div>
        </div>

        {/* Executive Recommendation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-brand-navy mb-4">
            Executive Recommendation
          </h2>
          <p className="text-gray-400 text-sm">
            [Your executive recommendation will display here after Slice 2]
          </p>
        </div>
      </div>
    </main>
  );
}
