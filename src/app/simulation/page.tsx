/**
 * /simulation — Participant entry point.
 *
 * Routing logic (in priority order):
 *   1. in_progress run → current round
 *   2. not_started run → orientation
 *   3. completed run → dashboard
 *   4. no run + cohort membership (accepted or pending) → auto-create run → orientation
 *   5. no cohort → holding page
 *
 * NOTE on ID resolution:
 *   supabase.auth.getUser() returns auth.users.id, but all application
 *   tables (public.users, simulation_runs, cohort_memberships) store
 *   public.users.id, which may differ. Participants added via the admin
 *   invite flow get a fresh public.users.id before they have an auth
 *   account, so the two UUIDs are different. We resolve public.users.id
 *   by email (the one field shared between auth.users and public.users).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SimulationPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Resolve public.users record by email ────────────────────────────────
  // public.users.id can differ from auth.users.id for admin-added participants.
  const { data: publicUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", user.email!)
    .maybeSingle();

  console.log("[/simulation] auth.users.id:", user.id);
  console.log("[/simulation] user.email:", user.email);
  console.log("[/simulation] public.users row:", publicUser);

  // Fall back to auth.users.id only if no public.users row exists yet.
  const userId = publicUser?.id ?? user.id;
  const userRole = publicUser?.role;

  console.log("[/simulation] resolved userId:", userId);

  if (userRole === "faculty") redirect("/faculty/dashboard");

  const isAdmin = userRole === "admin";

  // ── Fetch existing simulation runs ──────────────────────────────────────
  const { data: runs, error: runsError } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  console.log("[/simulation] runs query userId:", userId);
  console.log("[/simulation] runs:", runs);
  console.log("[/simulation] runs error:", runsError);

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

  // ── No run — check cohort membership and auto-create ───────────────────
  const { data: membership, error: membershipError } = await supabase
    .from("cohort_memberships")
    .select("cohort_id")
    .eq("user_id", userId)
    .in("invitation_status", ["accepted", "pending"])
    .maybeSingle();

  console.log("[/simulation] membership query userId:", userId);
  console.log("[/simulation] membership:", membership);
  console.log("[/simulation] membership error:", membershipError);

  if (membership) {
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id, scenario_version_id, status")
      .eq("id", membership.cohort_id)
      .eq("status", "active")
      .maybeSingle();

    console.log("[/simulation] cohort:", cohort);

    if (cohort) {
      const { data: newRun, error: createError } = await supabase
        .from("simulation_runs")
        .insert({
          user_id: userId,
          cohort_id: cohort.id,
          scenario_version_id: cohort.scenario_version_id,
          status: "not_started",
          current_round_number: 1,
          is_preview: isAdmin,
        })
        .select("id")
        .single();

      console.log("[/simulation] newRun:", newRun, "createError:", createError);

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

      console.log("[/simulation] existingRun:", existingRun);

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
