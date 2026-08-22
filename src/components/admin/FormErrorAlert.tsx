/**
 * Renders the failure reason carried by the ?error= query param after a
 * form POST redirects back to its form page.
 *
 * WCAG: role="alert" so the message is announced, failure conveyed by the
 * "Could not save" wording and a symbol rather than colour alone.
 */

const MESSAGES: Record<string, string> = {
  invalid_form: "The form could not be read. Please try submitting again.",
  missing_fields: "Fill in every required field before saving.",
  save_failed:
    "The database rejected the change. Nothing was saved. Please try again.",
};

export default function FormErrorAlert({ code }: { code?: string }) {
  if (!code) return null;

  const message = MESSAGES[code] ?? "The change could not be saved.";

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3"
    >
      <span aria-hidden="true" className="text-red-700 font-bold">
        !
      </span>
      <p className="text-sm text-red-800">
        <span className="font-semibold">Could not save. </span>
        {message}
      </p>
    </div>
  );
}
