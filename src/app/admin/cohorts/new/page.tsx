/**
 * Create Cohort — /admin/cohorts/new
 *
 * Form to create a new cohort (status defaults to 'draft').
 * On submit, POSTs to /api/admin/cohorts and redirects to the new cohort page.
 *
 * Access control: admin only.
 *
 * WCAG: all inputs have associated <label>; required fields marked with text
 * "(required)" visible to screen readers; browser native validation fires
 * before form POST; focus management via autofocus on name input.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NewCohortPage() {
  const supabase = createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Role check ──────────────────────────────────────────────────────────────

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow || userRow.role !== "admin") {
    redirect(userRow?.role === "faculty" ? "/faculty/dashboard" : "/simulation");
  }

  // ── Load active scenario versions for dropdown ────────────────────────────

  const { data: scenarioVersions } = await supabase
    .from("scenario_versions")
    .select("id, version_label, is_active, scenarios(title)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Fall back to all versions if none are marked active
  const { data: allVersions } = scenarioVersions?.length
    ? { data: scenarioVersions }
    : await supabase
        .from("scenario_versions")
        .select("id, version_label, is_active, scenarios(title)")
        .order("created_at", { ascending: false });

  const versions = allVersions ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy mt-2">
          Create New Cohort
        </h1>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form action="/api/admin/cohorts" method="POST">
          {/* Cohort name */}
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Cohort Name{" "}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              autoComplete="off"
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
              placeholder="e.g. BWXT Leadership Academy 2026 — Cohort A"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Description{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                resize-y
              "
              placeholder="Brief description of this cohort"
            />
          </div>

          {/* Academy start date */}
          <div className="mb-5">
            <label
              htmlFor="academy_start_date"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academy Start Date{" "}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="academy_start_date"
              name="academy_start_date"
              type="date"
              required
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          {/* Academy end date */}
          <div className="mb-5">
            <label
              htmlFor="academy_end_date"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Academy End Date{" "}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="academy_end_date"
              name="academy_end_date"
              type="date"
              required
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          {/* Simulator deadline */}
          <div className="mb-5">
            <label
              htmlFor="simulator_deadline"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Simulator Deadline{" "}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="simulator_deadline"
              name="simulator_deadline"
              type="datetime-local"
              required
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          {/* Scenario version */}
          <div className="mb-6">
            <label
              htmlFor="scenario_version_id"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Scenario Version{" "}
              <span aria-hidden="true" className="text-red-500">
                *
              </span>
              <span className="sr-only">(required)</span>
            </label>
            {versions.length === 0 ? (
              <p className="text-sm text-red-600" role="alert">
                No scenario versions found. Please seed the database first.
              </p>
            ) : (
              <select
                id="scenario_version_id"
                name="scenario_version_id"
                required
                defaultValue=""
                className="
                  w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                  bg-white
                "
              >
                <option value="" disabled>
                  Select a version…
                </option>
                {versions.map((v) => {
                  const scenarios = v.scenarios;
                  const scenarioTitle = Array.isArray(scenarios)
                    ? (scenarios[0] as { title: string } | undefined)?.title
                    : (scenarios as { title: string } | null)?.title;
                  return (
                    <option key={v.id} value={v.id}>
                      {scenarioTitle ? `${scenarioTitle} — ` : ""}
                      {v.version_label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="
                px-5 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-md
                hover:bg-brand-blue/90 transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
              "
            >
              Create Cohort
            </button>
            <Link
              href="/admin/dashboard"
              className="
                px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 rounded-md
              "
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
