"use client";

/**
 * RoundForm
 *
 * Client component that manages all interactive state for a round's decisions,
 * validates locally before submission, and posts to the submit API.
 * Simulation logic stays in the API route — this component only handles
 * form state and UX.
 *
 * WCAG: each decision is a labelled section with heading; validation errors
 * use role="alert" and aria-invalid; focus is moved to first error on failed
 * submit; submit button reflects loading state accessibly.
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DecisionTemplate } from "@/engine/types";
import SingleSelectDecision from "./SingleSelectDecision";
import MultiSelectDecision from "./MultiSelectDecision";
import ResourceAllocationDecision from "./ResourceAllocationDecision";

// ─── State types ──────────────────────────────────────────────────────────────

interface DecisionState {
  selectedOptionIds: string[];
  allocationJson?: Record<string, number>;
  shortRationaleText?: string;
}

type FormState = Record<string, DecisionState>;
type ValidationErrors = Record<string, string>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialState(decisions: DecisionTemplate[]): FormState {
  const state: FormState = {};
  for (const d of decisions) {
    if (d.decisionType === "resource_allocation") {
      // Equal distribution as starting point
      const each = Math.floor(100 / d.options.length);
      const remainder = 100 - each * d.options.length;
      const allocation: Record<string, number> = {};
      d.options.forEach((opt, i) => {
        allocation[opt.key] = each + (i === 0 ? remainder : 0);
      });
      state[d.key] = {
        selectedOptionIds: d.options.map((o) => o.key),
        allocationJson: allocation,
      };
    } else {
      state[d.key] = { selectedOptionIds: [] };
    }
  }
  return state;
}

function validate(
  decisions: DecisionTemplate[],
  state: FormState
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const d of decisions) {
    if (!d.isRequired) continue;
    const s = state[d.key] ?? { selectedOptionIds: [] };

    if (d.decisionType === "single_select") {
      if (s.selectedOptionIds.length !== 1) {
        errors[d.key] = "Please select one option.";
      }
    } else if (d.decisionType === "multi_select") {
      const min = d.minChoices ?? 1;
      const max = d.maxChoices ?? d.options.length;
      const count = s.selectedOptionIds.length;
      if (count < min || count > max) {
        errors[d.key] =
          min === max
            ? `Please select exactly ${min} option${min !== 1 ? "s" : ""}.`
            : `Please select between ${min} and ${max} options.`;
      }
    } else if (d.decisionType === "resource_allocation") {
      const alloc = s.allocationJson ?? {};
      const total = Object.values(alloc).reduce(
        (sum, v) => sum + (v || 0),
        0
      );
      if (total !== 100) {
        errors[d.key] = `Allocation must total 100%. Currently: ${total}%.`;
      }
    }
  }

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RoundFormProps {
  decisions: DecisionTemplate[];
  runId: string;
  roundNumber: number;
}

export default function RoundForm({
  decisions,
  runId,
  roundNumber,
}: RoundFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(() =>
    buildInitialState(decisions)
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refs to decision section headings for focus management
  const decisionRefs = useRef<Record<string, HTMLElement | null>>({});

  const updateDecision = useCallback(
    (decisionKey: string, patch: Partial<DecisionState>) => {
      setFormState((prev) => ({
        ...prev,
        [decisionKey]: { ...prev[decisionKey], ...patch },
      }));
      // Clear per-field error on change
      setErrors((prev) => {
        if (!prev[decisionKey]) return prev;
        const next = { ...prev };
        delete next[decisionKey];
        return next;
      });
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate(decisions, formState);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Move focus to the first decision with an error
      const firstErrorKey = Object.keys(validationErrors)[0];
      decisionRefs.current[firstErrorKey]?.focus();
      return;
    }

    setSubmitting(true);

    const responses = decisions.map((d) => {
      const s = formState[d.key];
      return {
        decisionKey: d.key,
        selectedOptionIds: s.selectedOptionIds,
        allocationJson: s.allocationJson ?? null,
        shortRationaleText: s.shortRationaleText ?? null,
      };
    });

    try {
      const res = await fetch(
        `/api/simulation/${runId}/round/${roundNumber}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses }),
        }
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setSubmitError(
          data.error ?? "Submission failed. Please check your answers and try again."
        );
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as { redirectTo: string };
      router.push(data.redirectTo);
    } catch {
      setSubmitError(
        "A network error occurred. Please check your connection and try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Round decisions">
      {/* Global submission error */}
      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex items-start gap-3 p-4 bg-bwxt-crimson-light border border-bwxt-crimson/30 rounded-xl text-bwxt-crimson text-[15px]"
        >
          <span aria-hidden="true" className="font-bold mt-0.5">&#9888;</span>
          <span>{submitError}</span>
        </div>
      )}

      <div className="space-y-8">
        {decisions.map((decision, index) => {
          const s = formState[decision.key];
          const error = errors[decision.key];

          const min = decision.minChoices;
          const max = decision.maxChoices;
          const constraintText =
            decision.decisionType === "multi_select" && min != null && max != null
              ? min === max
                ? ` — select ${min}`
                : ` — select ${min}–${max}`
              : "";

          return (
            <section
              key={decision.key}
              aria-labelledby={`decision-heading-${decision.key}`}
              className={`bg-white border rounded-xl shadow-card p-6 ${
                error ? "border-bwxt-danger" : "border-bwxt-border"
              }`}
            >
              {/* Decision header */}
              <div className="mb-4">
                <div className="text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.04em] mb-1">
                  Decision {index + 1} of {decisions.length}
                  {" · "}
                  {decision.decisionType.replace(/_/g, " ")}
                  {constraintText}
                  {decision.isRequired && (
                    <span className="text-bwxt-danger ml-1" aria-hidden="true">
                      *
                    </span>
                  )}
                </div>
                <h3
                  id={`decision-heading-${decision.key}`}
                  ref={(el) => {
                    decisionRefs.current[decision.key] = el;
                  }}
                  tabIndex={-1}
                  className="text-bwxt-navy font-semibold text-[16px] leading-snug mb-2 focus:outline-none"
                >
                  {decision.title}
                </h3>
                <p className="text-[15px] text-bwxt-text-secondary leading-[1.65]">
                  {decision.prompt}
                </p>
              </div>

              {/* Decision input — driven by type */}
              {decision.decisionType === "single_select" && (
                <SingleSelectDecision
                  decision={decision}
                  value={s.selectedOptionIds[0] ?? null}
                  onChange={(key) =>
                    updateDecision(decision.key, { selectedOptionIds: [key] })
                  }
                  error={error}
                />
              )}

              {decision.decisionType === "multi_select" && (
                <MultiSelectDecision
                  decision={decision}
                  value={s.selectedOptionIds}
                  onChange={(keys) =>
                    updateDecision(decision.key, { selectedOptionIds: keys })
                  }
                  error={error}
                />
              )}

              {decision.decisionType === "resource_allocation" && (
                <ResourceAllocationDecision
                  decision={decision}
                  value={s.allocationJson ?? {}}
                  onChange={(alloc) =>
                    updateDecision(decision.key, { allocationJson: alloc })
                  }
                  error={error}
                />
              )}
            </section>
          );
        })}
      </div>

      {/* Required field notice */}
      <p className="mt-6 text-[13px] text-bwxt-text-muted">
        <span aria-hidden="true">*</span>{" "}
        <span className="sr-only">Asterisk indicates </span>Required
      </p>

      {/* Submit */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={submitting}
          aria-disabled={submitting}
          className="
            bg-bwxt-navy hover:bg-bwxt-navy-dark text-white font-semibold text-[15px]
            rounded-[14px] py-[14px] w-full transition-colors duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
          "
        >
          {submitting ? (
            <span>
              <span aria-hidden="true">Submitting&hellip;</span>
              <span className="sr-only">Submitting your decisions, please wait.</span>
            </span>
          ) : (
            "Submit Decisions"
          )}
        </button>
        <p className="mt-3 text-[13px] text-center text-bwxt-text-muted">
          Your decisions are final once submitted and cannot be changed.
        </p>
      </div>
    </form>
  );
}
