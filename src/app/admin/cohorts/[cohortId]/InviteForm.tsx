"use client";

/**
 * InviteForm — inline invite form for participants and faculty.
 *
 * Renders an "Invite" button that expands to an email input + submit.
 * On success:
 *  - If the user already exists: they are added to cohort_memberships immediately.
 *  - If the user does not exist: an invitation record is written to the
 *    invitations table (no email is sent in MVP).
 * Shows an inline success or error message after submission.
 * Calls router.refresh() so the parent server component re-renders the member table.
 *
 * WCAG: email input has an associated label (visually hidden via sr-only);
 * required attribute set; error/success uses role="alert" + aria-live;
 * focus moves to input when form opens.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  cohortId: string;
  inviteeRole: "participant" | "faculty";
}

export default function InviteForm({ cohortId, inviteeRole }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roleLabel = inviteeRole === "participant" ? "Participant" : "Faculty";

  function handleOpen() {
    setOpen(true);
    setMessage(null);
    // Defer focus until after DOM update
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleCancel() {
    setOpen(false);
    setEmail("");
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/cohorts/${cohortId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role: inviteeRole }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Invitation failed. Please try again.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.existed
          ? `${trimmed} has been added to this cohort as ${roleLabel.toLowerCase()}.`
          : `${trimmed} was added as ${roleLabel.toLowerCase()}. Note: they will need a login account set up before they can access the simulator.`,
      });
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="
            text-sm font-medium text-brand-blue hover:underline
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1 rounded
          "
        >
          + Add {roleLabel}
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex items-start gap-2 flex-wrap"
          aria-label={`Invite ${roleLabel.toLowerCase()} by email`}
        >
          <div className="flex-1 min-w-[220px]">
            <label
              htmlFor={`invite-email-${inviteeRole}`}
              className="sr-only"
            >
              Email address for {roleLabel.toLowerCase()}
            </label>
            <input
              ref={inputRef}
              id={`invite-email-${inviteeRole}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              aria-required="true"
              className="
                w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
              "
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            aria-disabled={loading || !email.trim()}
            className="
              px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-md
              hover:bg-brand-blue/90 transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
            "
          >
            {loading ? "Adding…" : "Add to Cohort"}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="
              px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 rounded-md
            "
          >
            Cancel
          </button>
        </form>
      )}

      {message && (
        <p
          className={`mt-2 text-sm ${
            message.type === "success" ? "text-green-700" : "text-red-600"
          }`}
          role="alert"
          aria-live="polite"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
