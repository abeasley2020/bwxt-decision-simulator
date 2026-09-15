"use client";

/**
 * MultiSelectDecision
 *
 * Renders a checkbox group for a multi_select decision.
 *
 * WCAG:
 *  - fieldset + legend; the legend states the required condition in words,
 *    because aria-required and aria-invalid are not supported on <fieldset>
 *    (role group) and are dropped there. aria-invalid lives on each input;
 *    aria-describedby is valid on the fieldset and stays there.
 *  - Options past the maximum use aria-disabled rather than the disabled
 *    attribute. A natively disabled control is removed from the
 *    accessibility tree, so the "maximum reached" description it points at
 *    could never be read and the option could not be reached by keyboard.
 *    aria-disabled keeps it focusable and describable; an onChange guard
 *    stops the selection.
 *  - Unavailable options are dimmed with a background change, not opacity.
 *    opacity-50 pushed the option label to 3.38:1 and its description to
 *    2.23:1 against white, both below the 4.5:1 floor.
 *  - One live region only (the selection counter).
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
  const maxReachedId = `${groupId}-max-reached`;

  const min = decision.minChoices ?? 1;
  const max = decision.maxChoices ?? decision.options.length;
  const count = value.length;
  const atMax = count >= max;

  const constraintLabel =
    min === max
      ? `Select exactly ${min} option${min !== 1 ? "s" : ""}`
      : `Select ${min} to ${max} options`;

  function handleChange(optionKey: string, checked: boolean, blocked: boolean) {
    // The control is aria-disabled rather than disabled, so the guard has to
    // live here: it stays focusable and describable but must not select.
    if (blocked) return;
    if (checked) {
      if (atMax) return; // prevent selecting beyond max
      onChange([...value, optionKey]);
    } else {
      onChange(value.filter((k) => k !== optionKey));
    }
  }

  return (
    <fieldset aria-describedby={`${counterId}${error ? ` ${errorId}` : ""}`}>
      <legend className="sr-only">
        {decision.title}
        {decision.isRequired ? ` (required, ${constraintLabel.toLowerCase()})` : ""}
      </legend>

      {/* Live selection counter: the one live region in this control */}
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
        {count} of {max} selected. {constraintLabel}.
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
                ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                focus-within:ring-2 focus-within:ring-bwxt-crimson focus-within:ring-offset-1
                ${
                  isSelected
                    ? "border-bwxt-crimson bg-bwxt-crimson-light"
                    : isDisabled
                    ? "border-bwxt-border bg-bwxt-bg"
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
                aria-disabled={isDisabled || undefined}
                onChange={(e) =>
                  handleChange(opt.key, e.target.checked, isDisabled)
                }
                className="
                  mt-0.5 h-4 w-4 text-bwxt-crimson border-bwxt-border-input rounded flex-shrink-0
                  focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-1 focus:outline-none
                "
                aria-invalid={error ? "true" : undefined}
                aria-describedby={
                  [isDisabled ? maxReachedId : "", error ? errorId : ""]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
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

      {/* Description target for options that are currently unavailable.
          Rendered whenever max is reached so aria-describedby can resolve. */}
      {atMax && (
        <p id={maxReachedId} className="sr-only">
          Unavailable. Maximum selections reached. Deselect an option to choose a
          different one.
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
