/**
 * /simulation — Participant entry point.
 *
 * Routing logic (in priority order):
 *   1. in_progress run → current round
 *   2. not_started run → orientation
 *   3. completed run → dashboard
 *   4. no run + accepted cohort membership → auto-create run → orientation
 *   5. no cohort → holding page
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SimulationPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Faculty and admin belong in the faculty dashboard, not the simulation flow
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (userRow?.role === "faculty" || userRow?.role === "admin") {
    redirect("/faculty/dashboard");
  }

  // Fetch all runs for this user in one query
  const { data: runs } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  for (const run of runs ?? []) {
    if (run.status === "in_progress") {
      redirect(`/simulation/${run.id}/round/${run.current_round_number}`);
    }
    if (run.status === "not_started") {
      redirect(`/simulation/${run.id}/orientation`);
    }
    if (run.status === "completed") {
      redirect(`/simulation/${run.id}/dashboard`);
    }
  }

  // No existing run — check for an accepted cohort membership and auto-create
  const { data: membership } = await supabase
    .from("cohort_memberships")
    .select("cohort_id")
    .eq("user_id", user.id)
    .eq("invitation_status", "accepted")
    .maybeSingle();

  if (membership) {
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id, scenario_version_id, status")
      .eq("id", membership.cohort_id)
      .eq("status", "active")
      .maybeSingle();

    if (cohort) {
      const { data: newRun, error: createError } = await supabase
        .from("simulation_runs")
        .insert({
          user_id: user.id,
          cohort_id: cohort.id,
          scenario_version_id: cohort.scenario_version_id,
          status: "not_started",
          current_round_number: 1,
        })
        .select("id")
        .single();

      if (newRun && !createError) {
        redirect(`/simulation/${newRun.id}/orientation`);
      }

      // If insert failed (e.g. unique conflict), re-query for the existing run
      const { data: existingRun } = await supabase
        .from("simulation_runs")
        .select("id, status, current_round_number")
        .eq("user_id", user.id)
        .eq("cohort_id", cohort.id)
        .maybeSingle();

      if (existingRun) {
        if (existingRun.status === "in_progress") {
          redirect(
            `/simulation/${existingRun.id}/round/${existingRun.current_round_number}`
          );
        }
        if (existingRun.status === "not_started") {
          redirect(`/simulation/${existingRun.id}/orientation`);
        }
        if (existingRun.status === "completed") {
          redirect(`/simulation/${existingRun.id}/dashboard`);
        }
      }
    }
  }

  // No cohort assignment found
  return (
    <main className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div
          className="text-brand-gold text-sm font-semibold tracking-widest uppercase mb-3"
          aria-hidden="true"
        >
          BWXT Leadership Academy
        </div>
        <h1 className="text-white text-2xl font-bold mb-4">
          No simulation assigned
        </h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Your simulation has not been assigned yet. Contact your program
          administrator or wait for your cohort invitation.
        </p>
      </div>
    </main>
  );
}
