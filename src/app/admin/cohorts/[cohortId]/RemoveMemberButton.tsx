"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  cohortId: string;
  userId: string;
  memberName: string;
}

export default function RemoveMemberButton({
  cohortId,
  userId,
  memberName,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/cohorts/${cohortId}/members/${userId}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to remove member.");
        setConfirming(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <span className="text-xs text-red-600" role="alert">
        {error}
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-gray-500">Remove {memberName}?</span>
        <button
          type="button"
          disabled={loading}
          onClick={handleRemove}
          className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded disabled:opacity-50"
        >
          {loading ? "Removing…" : "Yes, remove"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
      aria-label={`Remove ${memberName} from cohort`}
    >
      Remove
    </button>
  );
}
