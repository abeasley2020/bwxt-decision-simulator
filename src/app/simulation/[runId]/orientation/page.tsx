/**
 * Orientation page — shown before Round 1.
 * Presents scenario intro and self-assessment.
 * Placeholder for self-assessment form — structure is wired, content TBD.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";

interface Props {
  params: { runId: string };
}

export default async function OrientationPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, user_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "completed") redirect(`/simulation/${run.id}/dashboard`);

  return (
    <main className="min-h-screen bg-brand-navy text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-brand-gold text-sm font-semibold tracking-widest uppercase mb-2">
          BWXT Leadership Academy
        </div>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">
          Operation Iron Horizon
        </h1>
        <p className="text-white/50 text-sm mb-10 uppercase tracking-wide">
          Executive Decision Simulation
        </p>

        <div className="prose prose-invert prose-sm max-w-none mb-12">
          {IRON_HORIZON_VERSION.introContent.split("\n").map((line, i) => (
            <p key={i} className="text-white/80 leading-relaxed mb-3">
              {line}
            </p>
          ))}
        </div>

        <div className="border border-white/10 rounded-lg p-6 mb-10 bg-white/5">
          <h2 className="text-lg font-semibold mb-1">Before you begin</h2>
          <ul className="text-white/60 text-sm space-y-2 mt-3">
            <li>
              ✓ This simulation takes approximately{" "}
              {IRON_HORIZON_VERSION.estimatedDurationMinutes} minutes to complete.
            </li>
            <li>✓ You can pause and resume at any time.</li>
            <li>✓ Your decisions are logged and cannot be undone once submitted.</li>
            <li>✓ Your rationale matters — write thoughtfully.</li>
          </ul>
        </div>

        {/* Self-assessment placeholder */}
        <div className="border border-brand-gold/30 rounded-lg p-6 mb-10 bg-brand-gold/5">
          <h2 className="text-lg font-semibold mb-1 text-brand-gold">
            Self-Assessment
          </h2>
          <p className="text-white/50 text-sm mb-4">
            [Placeholder — self-assessment form will be implemented in Slice 2]
          </p>
        </div>

        {/* Begin button — posts to API to mark run as in_progress */}
        <form action={`/api/simulation/${params.runId}/begin`} method="POST">
          <button
            type="submit"
            className="w-full py-4 bg-brand-gold text-brand-navy font-bold text-lg rounded-md hover:bg-brand-gold/90 transition-colors"
          >
            Begin Simulation
          </button>
        </form>
      </div>
    </main>
  );
}
