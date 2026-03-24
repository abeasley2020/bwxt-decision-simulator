"use client";

/**
 * SingleSelectDecision
 *
 * Renders a radio-button group for a single_select decision.
 * WCAG: fieldset + legend; explicit label per radio; aria-invalid on error;
 * visible focus ring; error announced via role="alert".
 */

import type { DecisionTemplate } from "@/engine/types";

interface SingleSelectDecisionProps {
  decision: DecisionTemplate;
  value: string | null;
  onChange: (optionKey: string) => void;
  error?: string;
}

export default function SingleSelectDecision({
  decision,
  value,
  onChange,
  error,
}: SingleSelectDecisionProps) {
  const groupId = `decision-${decision.key}`;
  const errorId = `${groupId}-error`;

  return (
    <fieldset
      aria-required={decision.isRequired}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? "true" : undefined}
    >
      <legend className="sr-only">{decision.title}</legend>

      <div className="space-y-2">
        {decision.options.map((opt) => {
          const inputId = `${groupId}-${opt.key}`;
          const isSelected = value === opt.key;

          return (
            <label
              key={opt.key}
              htmlFor={inputId}
              className={`
                flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer
                transition-colors duration-100
                focus-within:ring-2 focus-within:ring-bwxt-crimson focus-within:ring-offset-1
                ${
                  isSelected
                    ? "border-bwxt-crimson bg-bwxt-crimson-light"
                    : error
                    ? "border-bwxt-danger bg-white"
                    : "border-bwxt-border bg-white hover:border-bwxt-navy/30 hover:bg-bwxt-navy-light/50"
                }
              `}
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                value={opt.key}
                checked={isSelected}
                onChange={() => onChange(opt.key)}
                className="
                  mt-0.5 h-4 w-4 text-bwxt-crimson border-bwxt-border cursor-pointer flex-shrink-0
                  focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-1 focus:outline-none
                "
              />
              <div className="min-w-0">
                <span className="block font-semibold text-[15px] text-bwxt-navy leading-snug">
                  {opt.label}
                </span>
                <span className="block text-[13px] text-bwxt-text-secondary mt-1 leading-relaxed">
                  {opt.description}
                </span>
              </div>
            </label>
          );
        })}
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
