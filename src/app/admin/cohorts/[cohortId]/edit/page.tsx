/**
 * Edit Cohort — /admin/cohorts/[cohortId]/edit
 *
 * Pre-filled form to update cohort fields including name, description,
 * dates, and status. POSTs to /api/admin/cohorts/[cohortId] on submit.
 *
 * Access control: admin only.
 *
 * WCAG: all inputs labelled; required fields marked; browser native
 * validation active; visible focus states.
 *
 * Note on datetime-local: stored and displayed in UTC. The browser
 * datetime-local input does not carry timezone information; values are
 * treated as UTC on both submission and display in this MVP.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ─── Date formatters for input default values ─────────────────────────────────

function toDateInput(d: string | null): string {
  if (!d) return "";
  // PostgreSQL date type returns YYYY-MM-DD; split("T") handles both date and timestamptz
  return d.split("T")[0];
}

function toDatetimeLocalInput(d: string | null): string {
  if (!d) return "";
  // Slice to YYYY-MM-DDTHH:MM (UTC, 16 chars)
  return new Date(d).toISOString().slice(0, 16);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditCohortPage({
  params,
}: {
  params: { cohortId: string };
}) {
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

  // ── Load cohort ──────────────────────────────────────────────────────────────

  const { data: cohort } = await supabase
    .from("cohorts")
    .select(
      "id, name, description, status, academy_start_date, academy_end_date, simulator_deadline"
    )
    .eq("id", params.cohortId)
    .maybeSingle();

  if (!cohort) notFound();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={`/admin/cohorts/${cohort.id}`}
          className="
            text-xs text-brand-blue font-medium hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          ← Back to Cohort
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy mt-2">Edit Cohort</h1>
        <p className="text-gray-500 text-sm mt-1">{cohort.name}</p>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form
          action={`/api/admin/cohorts/${cohort.id}`}
          method="POST"
        >
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
              defaultValue={cohort.name}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
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
              defaultValue={cohort.description ?? ""}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                resize-y
              "
            />
          </div>

          {/* Academy start */}
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
              defaultValue={toDateInput(cohort.academy_start_date)}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          {/* Academy end */}
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
              defaultValue={toDateInput(cohort.academy_end_date)}
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
              defaultValue={toDatetimeLocalInput(cohort.simulator_deadline)}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          {/* Status */}
          <div className="mb-6">
            <label
              htmlFor="status"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={cohort.status}
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
                bg-white
              "
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
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
              Save Changes
            </button>
            <Link
              href={`/admin/cohorts/${cohort.id}`}
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
