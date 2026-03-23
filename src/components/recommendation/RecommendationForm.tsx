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
            <div key={field.key} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-3">
                <span className="text-xs text-brand-gold font-semibold uppercase tracking-widest">
                  Question {idx + 1} of {FIELDS.length}
                </span>
              </div>
              <label
                htmlFor={fieldId}
                className="block text-sm font-semibold text-brand-navy mb-1"
              >
                {field.label}
                <span className="text-red-600 ml-1" aria-hidden="true">*</span>
              </label>
              <p
                id={`${fieldId}-prompt`}
                className="text-sm text-gray-500 mb-3 leading-relaxed"
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
                  w-full rounded-lg border px-4 py-3 text-sm text-gray-800
                  placeholder:text-gray-300 resize-y min-h-[120px]
                  focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent
                  transition-colors
                  ${
                    hasError
                      ? "border-red-400 bg-red-50/40"
                      : "border-gray-200 bg-white"
                  }
                `}
              />
              {hasError && (
                <p
                  id={errorId}
                  role="alert"
                  className="mt-1.5 text-xs text-red-600 font-medium"
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
          className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      <div className="mt-8 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label={isSubmitting ? "Submitting your recommendation…" : undefined}
          className="
            w-full py-4 bg-brand-navy text-white font-bold text-base rounded-lg
            hover:bg-brand-navy/90 transition-colors
            focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? "Submitting…" : "Submit Executive Recommendation"}
        </button>
        <p className="mt-3 text-center text-xs text-gray-400">
          This is your final submission. Your responses will be reviewed by
          faculty.
        </p>
      </div>
    </form>
  );
}
