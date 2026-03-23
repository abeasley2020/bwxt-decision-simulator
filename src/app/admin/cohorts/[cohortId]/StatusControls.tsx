"use client";

/**
 * StatusControls — client component for cohort status transitions.
 *
 * Shows the appropriate action button based on current status:
 *  - draft   → "Activate Cohort"
 *  - active  → "Close Cohort"
 *  - closed  → informational text (no further transitions)
 *
 * On success, calls router.refresh() to re-render the server component.
 * Inline error displayed if the API call fails.
 *
 * WCAG: buttons have descriptive labels; error uses role="alert";
 * disabled state communicated via aria-disabled + disabled attribute.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  cohortId: string;
  currentStatus: "draft" | "active" | "closed";
}

export default function StatusControls({ cohortId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(newStatus: "active" | "closed") {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/cohorts/${cohortId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update status. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        {currentStatus === "draft" && (
          <button
            onClick={() => changeStatus("active")}
            disabled={loading}
            aria-disabled={loading}
            className="
              px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md
              hover:bg-green-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? "Activating…" : "Activate Cohort"}
          </button>
        )}

        {currentStatus === "active" && (
          <button
            onClick={() => changeStatus("closed")}
            disabled={loading}
            aria-disabled={loading}
            className="
              px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-md
              hover:bg-gray-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? "Closing…" : "Close Cohort"}
          </button>
        )}

        {currentStatus === "closed" && (
          <p className="text-sm text-gray-500 italic">
            This cohort is closed. No further status changes are available.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
