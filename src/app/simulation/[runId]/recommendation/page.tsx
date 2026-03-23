/**
 * Executive Recommendation Page
 * Route: /simulation/[runId]/recommendation
 *
 * Presents five structured prompts for the participant to articulate
 * their strategic direction and leadership intent. Responses are
 * captured for faculty review.
 *
 * Accessible after all 3 rounds are submitted. Redirects to /complete
 * if the simulation is already finished.
 *
 * The form itself is a client component (RecommendationForm) that
 * handles interactive state and submission. This server component
 * handles auth, run-state guards, and initial page render.
 *
 * WCAG: semantic landmark regions; correct heading hierarchy;
 * all interactive elements owned by RecommendationForm.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecommendationForm from "@/components/recommendation/RecommendationForm";

interface Props {
  params: { runId: string };
}

export default async function RecommendationPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run) notFound();

  // Guard: route state checks
  if (run.status === "completed") {
    redirect(`/simulation/${run.id}/complete`);
  }
  if (run.status === "not_started") {
    redirect(`/simulation/${run.id}/orientation`);
  }
  if (run.current_round_number < 4) {
    redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
  }

  return (
    <div className="min-h-screen bg-brand-light">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-brand-navy text-white">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div
            className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-1"
            aria-hidden="true"
          >
            Final Step
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Executive Recommendation
          </h1>
          <p className="text-white/50 text-sm mt-0.5">
            Operation Iron Horizon &mdash; Your Strategic Position
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* ── Context ─────────────────────────────────────────────────── */}
        <section aria-labelledby="context-heading" className="mb-8">
          <h2
            id="context-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Articulate Your Strategic Direction
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              You have completed 90 simulated days as Acting President of
              BWXT&apos;s largest operating division. Based on the decisions
              you made and their consequences, articulate your executive
              recommendation across five dimensions.
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">
              These responses will be reviewed by faculty as part of your
              leadership assessment. Answer thoughtfully — they reveal how you
              think, not just what you would do.
            </p>
          </div>
        </section>

        {/* ── Form ────────────────────────────────────────────────────── */}
        <section aria-labelledby="form-heading">
          <h2 id="form-heading" className="sr-only">
            Executive Recommendation Form
          </h2>
          <RecommendationForm runId={run.id} />
        </section>
      </main>
    </div>
  );
}
