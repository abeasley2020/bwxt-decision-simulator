/**
 * SelfAssessmentForm
 *
 * Renders self-assessment form fields intended to be placed inside a <form>
 * element in the orientation page. Native HTML form — no JavaScript required.
 * Responses are submitted with the Begin Simulation form POST.
 *
 * WCAG: fieldset + legend per question group; labels for all inputs;
 * required attribute on radio groups; visible focus styles.
 */

const RATING_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Some",
  3: "Moderate",
  4: "Strong",
  5: "Expert",
};

interface RatingQuestionProps {
  name: string;
  legend: string;
  id: string;
}

function RatingQuestion({ name, legend, id }: RatingQuestionProps) {
  return (
    <fieldset className="border-b border-bwxt-border pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
      <legend
        id={id}
        className="text-[15px] font-medium text-bwxt-navy mb-3 block"
      >
        {legend}
      </legend>
      <div
        role="group"
        aria-labelledby={id}
        className="flex flex-wrap gap-3"
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            className="flex flex-col items-center gap-1 cursor-pointer group"
          >
            <input
              type="radio"
              name={name}
              value={String(value)}
              required={value === 1}
              className="
                w-5 h-5 text-bwxt-crimson border-bwxt-border cursor-pointer
                focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-1
              "
            />
            <span className="text-[12px] font-semibold text-bwxt-navy tabular-nums">
              {value}
            </span>
            <span className="text-[12px] text-bwxt-text-muted">{RATING_LABELS[value]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SelfAssessmentForm() {
  return (
    <div>
      <RatingQuestion
        id="sa-q1-legend"
        name="sa_q1"
        legend="1. Rate your current confidence in making high-stakes financial decisions."
      />

      <RatingQuestion
        id="sa-q2-legend"
        name="sa_q2"
        legend="2. Rate your experience managing complex talent and leadership challenges."
      />

      <RatingQuestion
        id="sa-q3-legend"
        name="sa_q3"
        legend="3. Rate your familiarity with regulatory and compliance environments."
      />

      <div className="mb-2">
        <label
          htmlFor="sa_q4"
          className="block text-[15px] font-medium text-bwxt-navy mb-2"
        >
          4. As you begin this simulation, what is your primary leadership
          concern? <span className="text-bwxt-text-muted font-normal">(Optional)</span>
        </label>
        <textarea
          id="sa_q4"
          name="sa_q4"
          rows={3}
          maxLength={500}
          placeholder="Describe the leadership challenge you find most difficult or most relevant to your current role..."
          className="
            w-full px-3 py-2 rounded-lg border border-bwxt-border text-bwxt-navy
            text-[15px] leading-relaxed placeholder-bwxt-text-muted
            focus:outline-none focus:border-bwxt-crimson focus:ring-1 focus:ring-bwxt-crimson
            resize-y
          "
        />
      </div>
    </div>
  );
}
