/**
 * Faculty cohort dashboard — placeholder.
 * Full implementation in Slice 3.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: { cohortId: string };
}

export default async function FacultyCohortPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify faculty/admin role in this cohort
  const { data: membership } = await supabase
    .from("cohort_memberships")
    .select("cohort_role")
    .eq("user_id", user.id)
    .eq("cohort_id", params.cohortId)
    .maybeSingle();

  if (!membership || !["faculty", "admin"].includes(membership.cohort_role)) {
    notFound();
  }

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("name, status, simulator_deadline")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) notFound();

  return (
    <main className="min-h-screen bg-brand-light">
      <div className="bg-brand-navy text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-brand-gold text-xs font-semibold uppercase tracking-wider mr-3">
              Faculty View
            </span>
            <span className="font-semibold">{cohort.name}</span>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${
              cohort.status === "active"
                ? "bg-green-500/20 text-green-400"
                : "bg-white/10 text-white/50"
            }`}
          >
            {cohort.status}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-navy mb-6">
          Cohort Insights — {cohort.name}
        </h1>

        {/* Summary cards placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {["Completion Rate", "Avg KPI Score", "Top Profile", "Decisions Made"].map(
            (label) => (
              <div
                key={label}
                className="bg-white border border-gray-200 rounded-lg p-5"
              >
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {label}
                </div>
                <div className="text-2xl font-bold text-brand-navy">—</div>
              </div>
            )
          )}
        </div>

        {/* Participant list placeholder */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-brand-navy mb-4">Participants</h2>
          <p className="text-gray-400 text-sm">
            [Participant completion table — Slice 3]
          </p>
        </div>

        {/* Decision patterns placeholder */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-brand-navy mb-4">Decision Patterns</h2>
          <p className="text-gray-400 text-sm">
            [Cohort decision pattern heatmap — Slice 3]
          </p>
        </div>
      </div>
    </main>
  );
}
