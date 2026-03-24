/**
 * Round page — loads scenario round content and renders the interactive
 * decision form.
 *
 * Static content (briefing, event) is server-rendered.
 * Interactive decisions are delegated to the RoundForm client component.
 * Scenario content is loaded from authored content files — never hardcoded
 * in this file.
 *
 * WCAG: semantic landmark regions; correct heading hierarchy (h1 → h2 → h3);
 * all interactive elements are in RoundForm which owns ARIA/keyboard concerns.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";
import RoundForm from "@/components/round/RoundForm";
import PreviewBanner from "@/components/simulation/PreviewBanner";

interface Props {
  params: { runId: string; roundNumber: string };
}

export default async function RoundPage({ params }: Props) {
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

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) notFound();

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id, is_preview")
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!run) notFound();
  if (run.status === "completed") redirect(`/simulation/${run.id}/complete`);
  if (run.status === "not_started") {
    redirect(`/simulation/${run.id}/orientation`);
  }

  // If this round has already been submitted, send to its consequence page
  if (roundNumber < run.current_round_number) {
    redirect(`/simulation/${run.id}/round/${roundNumber}/consequence`);
  }

  // If the participant is on a different round, redirect to the correct one
  if (roundNumber !== run.current_round_number) {
    redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
  }

  const round = IRON_HORIZON_VERSION.rounds.find(
    (r) => r.roundNumber === roundNumber
  );
  if (!round) notFound();

  return (
    <div className="min-h-screen bg-bwxt-bg">
      {run.is_preview && <PreviewBanner />}

      {/* Round header strip */}
      <div className="bg-bwxt-navy-light border-b border-bwxt-border">
        <div className="max-w-[880px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-bwxt-navy text-white text-[12px] font-semibold px-3 py-1 rounded-full">
              Round {roundNumber}
            </span>
            <span className="text-bwxt-text-secondary text-[13px]">
              &mdash; {round.title}
            </span>
          </div>
          <span className="text-bwxt-text-muted text-[13px]">
            {round.decisions.length} Decisions
          </span>
        </div>
      </div>

      <main className="max-w-[880px] mx-auto px-6 py-8 space-y-8">
        {/* ── Situation Briefing ──────────────────────────────────────── */}
        <section aria-labelledby="briefing-heading">
          <h2
            id="briefing-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-3"
          >
            Situation Briefing
          </h2>
          <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
            {round.briefingContent
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p
                  key={i}
                  className="text-[15px] text-bwxt-text-primary leading-[1.65] mb-2 last:mb-0"
                >
                  {line}
                </p>
              ))}
          </div>
        </section>

        {/* ── Event / Situation Update ────────────────────────────────── */}
        {round.eventContent && (
          <section aria-labelledby="event-heading">
            <h2 id="event-heading" className="sr-only">
              Situation Update
            </h2>
            <div className="border-l-4 border-bwxt-navy bg-bwxt-navy-light rounded-r-xl px-6 py-5">
              <div
                className="text-[12px] font-semibold text-bwxt-navy uppercase tracking-[0.05em] mb-3"
                aria-hidden="true"
              >
                Situation Update
              </div>
              {round.eventContent
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <p
                    key={i}
                    className="font-playfair italic text-[16px] text-bwxt-navy leading-relaxed"
                  >
                    {line}
                  </p>
                ))}
            </div>
          </section>
        )}

        {/* ── Your Decisions ──────────────────────────────────────────── */}
        <section aria-labelledby="decisions-heading">
          <h2
            id="decisions-heading"
            className="text-[18px] font-semibold text-bwxt-navy mb-6"
          >
            Your Decisions
          </h2>
          <RoundForm
            decisions={round.decisions}
            runId={params.runId}
            roundNumber={roundNumber}
          />
        </section>
      </main>
    </div>
  );
}
