/**
 * Admin cohort management — placeholder.
 * Full implementation in Slice 4.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCohortsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify admin role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser || dbUser.role !== "admin") {
    redirect("/simulation");
  }

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, status, simulator_deadline")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-brand-light">
      <div className="bg-brand-navy text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold">Admin — Cohort Management</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-brand-navy">Cohorts</h1>
          <button className="px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-md hover:bg-brand-blue/90 transition-colors">
            + New Cohort
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">
                  Deadline
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(cohorts ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No cohorts yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                (cohorts ?? []).map((cohort) => (
                  <tr key={cohort.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-brand-navy">
                      {cohort.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                          cohort.status === "active"
                            ? "bg-green-100 text-green-700"
                            : cohort.status === "closed"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {cohort.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {cohort.simulator_deadline
                        ? new Date(cohort.simulator_deadline).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/admin/cohorts/${cohort.id}`}
                        className="text-brand-blue text-sm font-medium hover:underline"
                      >
                        Manage
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
