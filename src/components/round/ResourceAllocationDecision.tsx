"use client";

/**
 * ResourceAllocationDecision
 *
 * Renders a set of number inputs for a resource_allocation decision.
 * Participants distribute a percentage total (must sum to 100%) across
 * the available areas. Dollar amounts are computed and shown inline.
 *
 * WCAG:
 *  - The whole control is a <fieldset> with an sr-only <legend>, so
 *    aria-describedby and the group name are actually exposed. A bare
 *    <div> resolves to role generic, where both are dropped silently.
 *  - Each input carries its own aria-invalid and aria-describedby, which
 *    are valid on an input but not on a generic container.
 *  - Exactly one live region (the running total). Per-row dollar figures
 *    are reachable through aria-describedby instead of competing live
 *    regions, so a single keystroke queues a single announcement.
 *  - Input boundaries use bwxt.border-input (3:1 minimum, SC 1.4.11);
 *    bwxt.border is decorative and fails that threshold.
 *  - Total validity is carried by text as well as color (SC 1.4.1).
 */

import type { DecisionTemplate } from "@/engine/types";

const TOTAL_BUDGET_MILLIONS = 20;

interface ResourceAllocationDecisionProps {
  decision: DecisionTemplate;
  value: Record<string, number>;
  onChange: (allocation: Record<string, number>) => void;
  error?: string;
}

export default function ResourceAllocationDecision({
  decision,
  value,
  onChange,
  error,
}: ResourceAllocationDecisionProps) {
  const groupId = `decision-${decision.key}`;
  const errorId = `${groupId}-error`;
  const totalId = `${groupId}-total`;
  const instructionsId = `${groupId}-instructions`;

  const total = Object.values(value).reduce((sum, v) => sum + (v || 0), 0);
  const remaining = 100 - total;
  const isValid = total === 100;

  function handleChange(optionKey: string, raw: string) {
    const parsed = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    onChange({ ...value, [optionKey]: clamped });
  }

  const totalStatusClass = isValid
    ? "text-bwxt-success"
    : total > 100
    ? "text-bwxt-danger font-semibold"
    : "text-bwxt-warning";

  const totalStatusText = isValid
    ? "100% allocated, ready to submit"
    : total > 100
    ? `${total}% allocated, ${total - 100}% over budget`
    : `${total}% allocated, ${remaining}% remaining`;

  const describedBy = [instructionsId, totalId, error ? errorId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="sr-only">{decision.title}</legend>

      {/* Visible instructions, also referenced by the fieldset and by each
          input, so the rule is available before the first keystroke. */}
      <p
        id={instructionsId}
        className="text-[13px] text-bwxt-text-secondary leading-relaxed mb-3"
      >
        Enter a whole percentage for each of the {decision.options.length} areas
        below. The percentages must total exactly 100. The dollar figure beside
        each input is that percentage of the {`$${TOTAL_BUDGET_MILLIONS}M`}{" "}
        budget.
      </p>

      <div className="space-y-3 mb-4">
        {decision.options.map((opt) => {
          const inputId = `${groupId}-${opt.key}`;
          const dollarsId = `${inputId}-dollars`;
          const pct = value[opt.key] ?? 0;
          const dollars = ((TOTAL_BUDGET_MILLIONS * pct) / 100).toFixed(1);

          return (
            <div
              key={opt.key}
              className="bg-white border border-bwxt-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={inputId}
                    className="block font-semibold text-[15px] text-bwxt-navy leading-snug mb-0.5"
                  >
                    {opt.label}
                  </label>
                  <p className="text-[13px] text-bwxt-text-secondary leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                {/* Percentage input + computed dollar value */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      id={inputId}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={pct}
                      onChange={(e) => handleChange(opt.key, e.target.value)}
                      aria-label={`${opt.label}: percentage of budget`}
                      aria-describedby={`${dollarsId} ${instructionsId}${
                        error ? ` ${errorId}` : ""
                      }`}
                      aria-invalid={error ? "true" : undefined}
                      className="
                        w-16 px-2 py-1.5 text-right text-[15px] font-semibold
                        border border-bwxt-border-input rounded-md text-bwxt-navy
                        focus:outline-none focus:border-bwxt-crimson focus:ring-1
                        focus:ring-bwxt-crimson
                      "
                    />
                    <span className="text-[15px] text-bwxt-text-secondary font-medium">%</span>
                  </div>
                  {/* Not a live region: the running total below is the single
                      live region for this control. */}
                  <span
                    id={dollarsId}
                    className="text-[13px] text-bwxt-text-muted tabular-nums"
                  >
                    ${dollars}M
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total: the one and only live region in this control */}
      <div
        id={totalId}
        aria-live="polite"
        aria-atomic="true"
        className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
          isValid
            ? "bg-green-50 border-green-200"
            : total > 100
            ? "bg-bwxt-crimson-light border-bwxt-crimson/20"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <span className="text-[15px] font-medium text-bwxt-text-primary">
          Total allocated
        </span>
        <span className={`text-[15px] font-bold tabular-nums ${totalStatusClass}`}>
          {totalStatusText}
        </span>
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[14px] text-bwxt-danger flex items-center gap-1"
        >
          <span aria-hidden="true" className="font-bold">!</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
