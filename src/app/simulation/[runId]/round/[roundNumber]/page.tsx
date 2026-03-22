/**
 * Round page — shows briefing, event, and decision forms for one round.
 * Placeholder layout — decision UI components will be built in Slice 2.
 */

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IRON_HORIZON_VERSION } from "@/content/iron-horizon";

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
  if (run.status === "completed") redirect(`/simulation/${run.id}/dashboard`);
  if (run.status === "not_started") redirect(`/simulation/${run.id}/orientation`);

  const round = IRON_HORIZON_VERSION.rounds.find(
    (r) => r.roundNumber === roundNumber
  );
  if (!round) notFound();

  return (
    <main className="min-h-screen bg-brand-light">
      {/* Top bar */}
      <div className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mr-3">
            Round {round.roundNumber} of 3
          </span>
          <span className="text-white font-semibold">{round.title}</span>
        </div>
        <div className="text-white/40 text-sm">Operation Iron Horizon</div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Briefing */}
        <section className="mb-10">
          <h2 className="text-brand-navy text-xl font-bold mb-4">Situation Briefing</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {round.briefingContent.split("\n").map((line, i) => (
              <p key={i} className="text-gray-700 text-sm leading-relaxed mb-2">
                {line}
              </p>
            ))}
          </div>
        </section>

        {/* Event / Trigger */}
        {round.eventContent && (
          <section className="mb-10">
            <div className="bg-brand-navy/5 border-l-4 border-brand-gold rounded-r-lg p-5">
              <p className="text-brand-navy text-sm font-medium italic">
                {round.eventContent}
              </p>
            </div>
          </section>
        )}

        {/* Decisions placeholder */}
        <section>
          <h2 className="text-brand-navy text-xl font-bold mb-6">
            Your Decisions
          </h2>
          <div className="space-y-6">
            {round.decisions.map((decision) => (
              <div
                key={decision.key}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                  {decision.decisionType.replace(/_/g, " ")}
                  {decision.minChoices && decision.maxChoices
                    ? ` · Select ${decision.minChoices === decision.maxChoices ? decision.minChoices : `${decision.minChoices}–${decision.maxChoices}`}`
                    : ""}
                </div>
                <h3 className="text-brand-navy font-semibold text-base mb-2">
                  {decision.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{decision.prompt}</p>

                {/* Decision options placeholder */}
                <div className="space-y-2">
                  {decision.options.map((opt) => (
                    <div
                      key={opt.key}
                      className="border border-gray-200 rounded-md p-4 hover:border-brand-blue hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm text-brand-navy mb-1">
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit placeholder */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
            [Placeholder] Decision submission logic will be wired in Slice 2.
            Full interactive form components, validation, and API submission are coming next.
          </div>
        </section>
      </div>
    </main>
  );
}
