/**
 * POST /api/simulation/[runId]/recommendation
 *
 * Persists the participant's five-field executive recommendation,
 * marks the simulation run as completed, and returns a redirect URL.
 *
 * Request body: {
 *   prioritizedStrategy: string;
 *   actionPlan90Day: string;
 *   keyRisks: string;
 *   talentImplications: string;
 *   communicationApproach: string;
 * }
 *
 * Returns JSON: { redirectTo: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/errors";

interface RecommendationBody {
  prioritizedStrategy: string;
  actionPlan90Day: string;
  keyRisks: string;
  talentImplications: string;
  communicationApproach: string;
}

const REQUIRED_FIELDS: (keyof RecommendationBody)[] = [
  "prioritizedStrategy",
  "actionPlan90Day",
  "keyRisks",
  "talentImplications",
  "communicationApproach",
];

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email!)
    .maybeSingle();

  if (logQueryError("users lookup by email", publicUserError)) {
    return NextResponse.json(
      { error: "Could not load your account. Please try again." },
      { status: 500 }
    );
  }
  const userId = publicUser?.id ?? user.id;

  // Verify run ownership and eligibility
  const { data: run, error: runLookupError } = await supabase
    .from("simulation_runs")
    .select("id, status, current_round_number, user_id")
    .eq("id", params.runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (logQueryError("simulation_runs lookup", runLookupError)) {
    return NextResponse.json(
      { error: "Could not load your simulation run. Please try again." },
      { status: 500 }
    );
  }
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (run.status === "completed") {
    // Idempotent — already done, just redirect
    return NextResponse.json({
      redirectTo: `/simulation/${params.runId}/complete`,
    });
  }
  if (run.status !== "in_progress") {
    return NextResponse.json(
      { error: "Simulation is not in progress" },
      { status: 400 }
    );
  }
  if (run.current_round_number < 4) {
    return NextResponse.json(
      { error: "All rounds must be completed before submitting a recommendation" },
      { status: 400 }
    );
  }

  // Parse body
  let body: RecommendationBody;
  try {
    body = (await request.json()) as RecommendationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate all required fields
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
      return NextResponse.json(
        { error: `Field "${field}" is required and must not be empty` },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();

  // Insert executive recommendation
  const { error: recError } = await supabase
    .from("executive_recommendations")
    .insert({
      simulation_run_id: params.runId,
      prioritized_strategy: body.prioritizedStrategy.trim(),
      action_plan_90_day: body.actionPlan90Day.trim(),
      key_risks: body.keyRisks.trim(),
      talent_implications: body.talentImplications.trim(),
      communication_approach: body.communicationApproach.trim(),
    });

  if (recError) {
    // Unique constraint violation means already submitted
    if (recError.code === "23505") {
      return NextResponse.json({
        redirectTo: `/simulation/${params.runId}/complete`,
      });
    }
    return NextResponse.json({ error: recError.message }, { status: 500 });
  }

  // Mark run as completed
  const { error: runError } = await supabase
    .from("simulation_runs")
    .update({
      status: "completed",
      completed_at: now,
      last_active_at: now,
    })
    .eq("id", params.runId);

  // A run left in_progress after the recommendation is stored looks unfinished
  // to faculty and admin surfaces, so surface the failure to the participant.
  if (runError) {
    logQueryError("simulation_runs completion update", runError);
    return NextResponse.json(
      {
        error:
          "Your recommendation was saved but the simulation could not be marked complete. Please refresh and try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    redirectTo: `/simulation/${params.runId}/complete`,
  });
}
