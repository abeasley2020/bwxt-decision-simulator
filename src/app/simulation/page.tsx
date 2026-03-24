/**
 * /simulation — Participant entry point.
 *
 * Routing logic (in priority order):
 *   1. in_progress run → current round
 *   2. not_started run → orientation
 *   3. completed run → dashboard
 *   4. no run + cohort membership → auto-create run → orientation
 *   5. no cohort → holding page
 *
 * ID resolution note:
 *   All application tables (public.users, simulation_runs, cohort_memberships)
 *   use public.users.id. For accounts created via the admin invite flow after
 *   the provisioning fix, public.users.id = auth.users.id and direct ID
 *   lookup works. For older accounts where the IDs differ, we resolve
 *   public.users.id by email as a safety net.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SimulationPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Resolve public.users record ─────────────────────────────────────────────
  // Query by email so we get the correct public.users.id even when it differs
  // from auth.users.id (can happen for accounts provisioned before the
  // invite-flow fix).
  const { data: publicUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", user.email!)
    .maybeSingle();

  const userId   = publicUser?.id   ?? user.id;
  const userRole = publicUser?.role ?? null;

  if (userRole === "admin")   redirect("/admin/dashboard");
  if (userRole === "faculty") redirect("/faculty/dashboard");

  const isAdmin = false;

  // ── Find existing simulation run ────────────────────────────────────────────

  const { data: runs } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number")
    .eq("user_id", userId)
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

  // ── No run — check membership and auto-create ───────────────────────────────
  // The invite flow now creates the simulation_run at provisioning time, so
  // this path is a fallback for edge cases (e.g. run deleted, old data).

  const { data: membership } = await supabase
    .from("cohort_memberships")
    .select("cohort_id")
    .eq("user_id", userId)
    .in("invitation_status", ["accepted", "pending"])
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
          user_id:              userId,
          cohort_id:            cohort.id,
          scenario_version_id:  cohort.scenario_version_id,
          status:               "not_started",
          current_round_number: 1,
          is_preview:           isAdmin,
        })
        .select("id")
        .single();

      if (newRun && !createError) {
        redirect(`/simulation/${newRun.id}/orientation`);
      }

      // Insert failed (e.g. unique conflict) — re-query for the existing run
      const { data: existingRun } = await supabase
        .from("simulation_runs")
        .select("id, status, current_round_number")
        .eq("user_id", userId)
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
