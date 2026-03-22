/**
 * Simulation entry point — participant landing.
 * Loads or creates a simulation_run, then routes to the correct step.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SimulationPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Look up the participant's active simulation run
  const { data: run } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (run) {
    redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
  }

  // Check for a not-started run to begin
  const { data: notStarted } = await supabase
    .from("simulation_runs")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "not_started")
    .maybeSingle();

  if (notStarted) {
    redirect(`/simulation/${notStarted.id}/orientation`);
  }

  // Placeholder: no run found — show a holding page
  // In full implementation: admin creates run on participant invite
  return (
    <main className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="text-brand-gold text-sm font-semibold tracking-widest uppercase mb-2">
          BWXT Leadership Academy
        </div>
        <h1 className="text-white text-2xl font-bold mb-4">
          No active simulation found
        </h1>
        <p className="text-white/60 text-sm">
          Your simulation has not been assigned yet. Contact your program
          administrator or wait for your invitation.
        </p>
      </div>
    </main>
  );
}
