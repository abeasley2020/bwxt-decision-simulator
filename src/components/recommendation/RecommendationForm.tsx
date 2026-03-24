"use client";

/**
 * RecommendationForm
 *
 * Client component for the Executive Recommendation page.
 * Submits five structured fields to the recommendation API.
 *
 * WCAG: every textarea has an associated <label>; error messages are
 * role="alert" so screen readers announce them immediately; required
 * fields use aria-required; invalid fields use aria-invalid;
 * submit button is disabled (and labelled) while loading.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  runId: string;
}

interface FormState {
  prioritizedStrategy: string;
  actionPlan90Day: string;
  keyRisks: string;
  talentImplications: string;
  communicationApproach: string;
}

const FIELDS: {
  key: keyof FormState;
  label: string;
  prompt: string;
  placeholder: string;
}[] = [
  {
    key: "prioritizedStrategy",
    label: "Prioritized Strategy",
    prompt:
      "What is your top strategic priority for the next 12 months and why?",
    placeholder:
      "Describe your primary strategic priority and the reasoning behind it...",
  },
  {
    key: "actionPlan90Day",
    label: "90-Day Action Plan",
    prompt:
      "What are your three most important actions in the next 90 days?",
    placeholder:
      "List and briefly explain your three most critical near-term actions...",
  },
  {
    key: "keyRisks",
    label: "Key Risks",
    prompt:
      "What are the two biggest risks to your plan and how will you mitigate them?",
    placeholder:
      "Identify two significant risks and your mitigation approach for each...",
  },
  {
    key: "talentImplications",
    label: "Talent Implications",
    prompt: "What talent decisions are most critical to your success?",
    placeholder:
      "Describe the key people, capability, or succession decisions you must make...",
  },
  {
    key: "communicationApproach",
    label: "Communication Approach",
    prompt:
      "How will you communicate your direction to the organization?",
    placeholder:
      "Explain how you will build alignment and communicate your strategy broadly...",
  },
];

export default function RecommendationForm({ runId }: Props) {
  const router = useRouter();

  const [fields, setFields] = useState<FormState>({
    prioritizedStrategy: "",
    actionPlan90Day: "",
    keyRisks: "",
    talentImplications: "",
    communicationApproach: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    for (const field of FIELDS) {
      if (!fields[field.key].trim()) {
        next[field.key] = "This field is required.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/simulation/${runId}/recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setSubmitError(body.error ?? "Submission failed. Please try again.");
        return;
      }

      const body = (await res.json()) as { redirectTo?: string };
      if (body.redirectTo) {
        router.push(body.redirectTo);
      }
    } catch {
      setSubmitError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        {FIELDS.map((field, idx) => {
          const fieldId = `rec-${field.key}`;
          const errorId = `${fieldId}-error`;
          const hasError = Boolean(errors[field.key]);
          return (
            <div key={field.key} className="bg-white border border-bwxt-border rounded-xl shadow-card p-6">
              <div className="mb-3">
                <span className="text-[12px] font-semibold text-bwxt-crimson uppercase tracking-[0.06em]">
                  Question {idx + 1} of {FIELDS.length}
                </span>
              </div>
              <label
                htmlFor={fieldId}
                className="block text-[15px] font-semibold text-bwxt-navy mb-1"
              >
                {field.label}
                <span className="text-bwxt-danger ml-1" aria-hidden="true">*</span>
              </label>
              <p
                id={`${fieldId}-prompt`}
                className="text-[15px] text-bwxt-text-secondary mb-3 leading-[1.65]"
              >
                {field.prompt}
              </p>
              <textarea
                id={fieldId}
                name={field.key}
                rows={5}
                value={fields[field.key]}
                onChange={(e) => {
                  setFields((prev) => ({ ...prev, [field.key]: e.target.value }));
                  if (errors[field.key]) {
                    setErrors((prev) => ({ ...prev, [field.key]: undefined }));
                  }
                }}
                placeholder={field.placeholder}
                required
                aria-required="true"
                aria-invalid={hasError ? "true" : undefined}
                aria-describedby={
                  [
                    `${fieldId}-prompt`,
                    hasError ? errorId : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className={`
                  w-full rounded-lg border px-4 py-3 text-[15px] text-bwxt-navy
                  placeholder:text-bwxt-text-muted resize-y min-h-[120px]
                  focus:outline-none focus:border-bwxt-crimson focus:ring-1 focus:ring-bwxt-crimson
                  transition-colors
                  ${
                    hasError
                      ? "border-bwxt-danger bg-bwxt-crimson-light/30"
                      : "border-bwxt-border bg-white"
                  }
                `}
              />
              {hasError && (
                <p
                  id={errorId}
                  role="alert"
                  className="mt-1.5 text-[13px] text-bwxt-danger font-medium"
                >
                  {errors[field.key]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit-level error */}
      {submitError && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-bwxt-crimson-light border border-bwxt-crimson/30 px-4 py-3 text-[15px] text-bwxt-danger"
        >
          {submitError}
        </div>
      )}

      <div className="mt-8 border-t border-bwxt-border pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label={isSubmitting ? "Submitting your recommendation…" : undefined}
          className="
            w-full py-[14px] bg-bwxt-navy text-white font-semibold text-[15px]
            rounded-[14px] hover:bg-bwxt-navy-dark transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? "Submitting\u2026" : "Submit Executive Recommendation"}
        </button>
        <p className="mt-3 text-center text-[13px] text-bwxt-text-muted">
          This is your final submission. Your responses will be reviewed by
          faculty.
        </p>
      </div>
    </form>
  );
}
