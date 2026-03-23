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

interface Props {
  params: { runId: string; roundNumber: string };
}

export default async function RoundPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roundNumber = parseInt(params.roundNumber, 10);
  if (isNaN(roundNumber) || roundNumber < 1 || roundNumber > 3) notFound();

  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id")
    .eq("id", params.runId)
    .eq("user_id", user.id)
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
    <div className="min-h-screen bg-brand-light">
      {/* ── Header / progress bar ──────────────────────────────────────── */}
      <header className="bg-brand-navy text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div
              className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-0.5"
              aria-hidden="true"
            >
              Round {round.roundNumber} of 3
            </div>
            <h1 className="text-white font-bold text-lg leading-tight">
              {round.title}
            </h1>
          </div>
          <div className="text-white/40 text-xs text-right hidden sm:block">
            <div>Operation Iron Horizon</div>
            <div className="mt-0.5 flex gap-1" aria-label="Round progress">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1 w-8 rounded-full ${
                    n <= roundNumber ? "bg-brand-gold" : "bg-white/20"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Situation briefing ──────────────────────────────────────── */}
        <section aria-labelledby="briefing-heading" className="mb-8">
          <h2
            id="briefing-heading"
            className="text-brand-navy text-lg font-bold mb-3"
          >
            Situation Briefing
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {round.briefingContent
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p
                  key={i}
                  className="text-gray-700 text-sm leading-relaxed mb-2 last:mb-0"
                >
                  {line}
                </p>
              ))}
          </div>
        </section>

        {/* ── Event / trigger ─────────────────────────────────────────── */}
        {round.eventContent && (
          <section aria-labelledby="event-heading" className="mb-8">
            <h2 id="event-heading" className="sr-only">
              Triggering Event
            </h2>
            <div className="border-l-4 border-brand-gold bg-white rounded-r-xl p-5">
              <div
                className="text-xs font-semibold text-brand-gold uppercase tracking-wide mb-2"
                aria-hidden="true"
              >
                Executive Trigger
              </div>
              {round.eventContent
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <p
                    key={i}
                    className="text-brand-navy text-sm font-medium leading-relaxed"
                  >
                    {line}
                  </p>
                ))}
            </div>
          </section>
        )}

        {/* ── Interactive decisions ───────────────────────────────────── */}
        <section aria-labelledby="decisions-heading">
          <h2
            id="decisions-heading"
            className="text-brand-navy text-lg font-bold mb-6"
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
