/**
 * POST /api/admin/cohorts/[cohortId]/status
 *
 * Changes a cohort's status. Only valid forward transitions are allowed:
 *  - draft  → active
 *  - active → closed
 *  - closed → (no further transitions)
 *
 * Accepts JSON body: { status: "active" | "closed" }
 * Returns JSON: { ok: true } on success.
 *
 * Auth: admin role required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePublicUser } from "@/lib/auth/resolvePublicUser";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["active"],
  active: ["closed"],
  closed: [],
};

export async function POST(request: Request, props: { params: Promise<{ cohortId: string }> }) {
  const params = await props.params;
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve public.users by email first: auth.users.id and public.users.id
  // differ for legacy accounts, so an id-only lookup 403s a real admin.
  const viewer = await resolvePublicUser(supabase, user);

  if (!viewer || viewer.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const newStatus = body.status;

  if (!newStatus || !["active", "closed"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  // ── Validate transition ──────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("status")
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[cohort.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition from '${cohort.status}' to '${newStatus}'.`,
      },
      { status: 400 }
    );
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  const { error } = await supabase
    .from("cohorts")
    .update({ status: newStatus })
    .eq("id", params.cohortId);

  if (error) {
    console.error("Supabase write failed:", error.message);
    return NextResponse.json(
      { error: "The change could not be saved. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
