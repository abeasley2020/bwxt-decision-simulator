"use client";

/**
 * MultiSelectDecision
 *
 * Renders a checkbox group for a multi_select decision.
 * WCAG: fieldset + legend; explicit label per checkbox; aria-invalid on error;
 * live selection counter via aria-live; error announced via role="alert".
 */

import type { DecisionTemplate } from "@/engine/types";

interface MultiSelectDecisionProps {
  decision: DecisionTemplate;
  value: string[];
  onChange: (optionKeys: string[]) => void;
  error?: string;
}

export default function MultiSelectDecision({
  decision,
  value,
  onChange,
  error,
}: MultiSelectDecisionProps) {
  const groupId = `decision-${decision.key}`;
  const errorId = `${groupId}-error`;
  const counterId = `${groupId}-counter`;

  const min = decision.minChoices ?? 1;
  const max = decision.maxChoices ?? decision.options.length;
  const count = value.length;
  const atMax = count >= max;

  const constraintLabel =
    min === max
      ? `Select exactly ${min} option${min !== 1 ? "s" : ""}`
      : `Select ${min}–${max} options`;

  function handleChange(optionKey: string, checked: boolean) {
    if (checked) {
      if (atMax) return; // prevent selecting beyond max
      onChange([...value, optionKey]);
    } else {
      onChange(value.filter((k) => k !== optionKey));
    }
  }

  return (
    <fieldset
      aria-required={decision.isRequired}
      aria-describedby={`${counterId}${error ? ` ${errorId}` : ""}`}
      aria-invalid={error ? "true" : undefined}
    >
      <legend className="sr-only">{decision.title}</legend>

      {/* Live selection counter */}
      <p
        id={counterId}
        aria-live="polite"
        aria-atomic="true"
        className={`text-[13px] font-medium mb-3 ${
          count === max
            ? "text-bwxt-success"
            : count > 0
            ? "text-bwxt-crimson"
            : "text-bwxt-text-muted"
        }`}
      >
        {count} of {max} selected &mdash; {constraintLabel}
      </p>

      <div className="space-y-2">
        {decision.options.map((opt) => {
          const inputId = `${groupId}-${opt.key}`;
          const isSelected = value.includes(opt.key);
          const isDisabled = atMax && !isSelected;

          return (
            <label
              key={opt.key}
              htmlFor={inputId}
              className={`
                flex items-start gap-3 p-4 rounded-xl border-2 transition-colors duration-100
                ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                focus-within:ring-2 focus-within:ring-bwxt-crimson focus-within:ring-offset-1
                ${
                  isSelected
                    ? "border-bwxt-crimson bg-bwxt-crimson-light"
                    : error && !isSelected
                    ? "border-bwxt-danger bg-white"
                    : "border-bwxt-border bg-white hover:border-bwxt-navy/30 hover:bg-bwxt-navy-light/50"
                }
              `}
            >
              <input
                id={inputId}
                type="checkbox"
                value={opt.key}
                checked={isSelected}
                disabled={isDisabled}
                onChange={(e) => handleChange(opt.key, e.target.checked)}
                className="
                  mt-0.5 h-4 w-4 text-bwxt-crimson border-bwxt-border rounded flex-shrink-0
                  focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-1 focus:outline-none
                "
                aria-describedby={isDisabled ? `${groupId}-max-reached` : undefined}
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

      {/* Hidden status message for screen readers when max is reached */}
      {atMax && (
        <p id={`${groupId}-max-reached`} className="sr-only">
          Maximum selections reached. Deselect an option to choose a different one.
        </p>
      )}

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
