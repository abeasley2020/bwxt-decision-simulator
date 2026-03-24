"use client";

/**
 * InviteForm — inline invite form for participants and faculty.
 *
 * Renders an "Add" button that expands to an email input + submit.
 * On success:
 *  - Existing user: added to cohort_memberships immediately.
 *  - New user: auth account + public.users created, simulation_run
 *    provisioned, temp password displayed for the admin to share.
 * Calls router.refresh() so the parent server component re-renders the table.
 *
 * WCAG: email input has an associated label (sr-only); required attribute
 * set; error/success conveyed by role="alert" + aria-live; temp password
 * box is selectable text with a copy button.
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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const roleLabel = inviteeRole === "participant" ? "Participant" : "Faculty";

  function handleOpen() {
    setOpen(true);
    setMessage(null);
    setTempPassword(null);
    setCopied(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleCancel() {
    setOpen(false);
    setEmail("");
    setMessage(null);
    setTempPassword(null);
    setCopied(false);
  }

  async function handleCopy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can select text manually
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setMessage(null);
    setTempPassword(null);

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
          text: data.error ?? "Failed to add user. Please try again.",
        });
        return;
      }

      if (data.existed) {
        setMessage({
          type: "success",
          text: `${trimmed} has been added to this cohort as ${roleLabel.toLowerCase()}.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `New account created for ${trimmed}. Share the temporary password below — they can change it after first login.`,
        });
        setTempPassword(data.tempPassword ?? null);
      }

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
          aria-label={`Add ${roleLabel.toLowerCase()} by email`}
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

      {/* Temp password display — only shown for newly created accounts */}
      {tempPassword && (
        <div
          className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
          role="status"
          aria-live="polite"
          aria-label="Temporary password for new account"
        >
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
            Temporary Password
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-amber-900 bg-white border border-amber-200 rounded px-3 py-1.5 select-all">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="
                text-xs font-medium text-amber-700 hover:text-amber-900
                bg-white border border-amber-200 rounded px-2.5 py-1.5
                focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-1
                whitespace-nowrap transition-colors
              "
              aria-label={copied ? "Copied" : "Copy password to clipboard"}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-amber-700 mt-1.5">
            Save this now — it will not be shown again.
          </p>
        </div>
      )}
    </div>
  );
}
