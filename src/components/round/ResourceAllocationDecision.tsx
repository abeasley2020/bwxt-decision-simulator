"use client";

/**
 * ResourceAllocationDecision
 *
 * Renders a set of number inputs for a resource_allocation decision.
 * Participants distribute a percentage total (must sum to 100%) across
 * the available areas. Dollar amounts are computed and shown inline.
 *
 * WCAG: each input has an explicit label; live running total uses aria-live;
 * error announced via role="alert"; color + text convey total validity.
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
    ? "100% allocated — ready to submit"
    : total > 100
    ? `${total}% allocated — ${total - 100}% over budget`
    : `${total}% allocated — ${remaining}% remaining`;

  return (
    <div
      aria-describedby={`${totalId}${error ? ` ${errorId}` : ""}`}
      aria-invalid={error ? "true" : undefined}
    >
      <div className="space-y-3 mb-4">
        {decision.options.map((opt) => {
          const inputId = `${groupId}-${opt.key}`;
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
                      className="
                        w-16 px-2 py-1.5 text-right text-[15px] font-semibold
                        border border-bwxt-border rounded-md text-bwxt-navy
                        focus:outline-none focus:border-bwxt-crimson focus:ring-1
                        focus:ring-bwxt-crimson
                      "
                    />
                    <span className="text-[15px] text-bwxt-text-secondary font-medium">%</span>
                  </div>
                  <span
                    className="text-[13px] text-bwxt-text-muted tabular-nums"
                    aria-live="polite"
                    aria-label={`${opt.label}: $${dollars}M`}
                  >
                    ${dollars}M
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total — live region */}
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
    </div>
  );
}
