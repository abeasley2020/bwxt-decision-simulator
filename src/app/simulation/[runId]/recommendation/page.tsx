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
import PreviewBanner from "@/components/simulation/PreviewBanner";

interface Props {
  params: { runId: string };
}

export default async function RecommendationPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: publicUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();
  const userId = publicUser?.id ?? user.id;

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, is_preview")
    .eq("id", params.runId)
    .eq("user_id", userId)
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
    <div className="min-h-screen bg-bwxt-bg">
      {run.is_preview && <PreviewBanner />}

      {/* Status bar */}
      <div className="bg-bwxt-navy-light border-b border-bwxt-border">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center gap-3">
          <span className="bg-bwxt-crimson text-white text-[12px] font-semibold px-3 py-1 rounded-full">
            Final Step
          </span>
          <span className="text-bwxt-text-secondary text-[13px]">
            &mdash; Executive Recommendation
          </span>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-8">
        {/* ── Context ─────────────────────────────────────────────────── */}
        <section aria-labelledby="context-heading" className="mb-8">
          <h2
            id="context-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            Articulate Your Strategic Direction
          </h2>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
            <p className="text-[15px] text-bwxt-text-primary leading-[1.65] mb-3">
              You have completed 90 simulated days as Acting President of
              BWXT&apos;s largest operating division. Based on the decisions
              you made and their consequences, articulate your executive
              recommendation across five dimensions.
            </p>
            <p className="text-[15px] text-bwxt-text-primary leading-[1.65]">
              These responses will be reviewed by faculty as part of your
              leadership assessment. Answer thoughtfully &mdash; they reveal how you
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
