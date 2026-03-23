/**
 * /admin/cohorts — redirects to /admin/dashboard.
 *
 * The admin cohort list lives at /admin/dashboard. This route exists for
 * backward compatibility with any hard-coded links to /admin/cohorts.
 */

import { redirect } from "next/navigation";

export default function AdminCohortsRedirectPage() {
  redirect("/admin/dashboard");
}
