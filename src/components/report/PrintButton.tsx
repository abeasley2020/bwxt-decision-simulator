"use client";

/**
 * PrintButton — triggers the browser's print/save-to-PDF dialog.
 *
 * The print stylesheet hides anything in `.no-print` (including this button
 * and its wrapper) during printing, so users get a clean, page-only export
 * with no UI chrome.
 */

interface PrintButtonProps {
  /** Visible label */
  label?: string;
  /** Helper text rendered beneath the button (full variant only) */
  hint?: string;
  /** Compact (header) or full-width (footer) layout */
  size?: "compact" | "full";
}

export default function PrintButton({
  label = "Download as PDF",
  hint = "Use your browser's print dialog and choose 'Save as PDF' as the destination.",
  size = "full",
}: PrintButtonProps) {
  if (size === "compact") {
    return (
      <button
        type="button"
        onClick={() => window.print()}
        className="
          no-print inline-flex items-center gap-2
          bg-bwxt-navy text-white font-semibold text-[13px]
          px-4 py-2 rounded-lg
          hover:bg-bwxt-navy-dark transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
        "
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 4V1h8v3M4 12H2V6h12v6h-2M4 9h8v6H4V9z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
    );
  }

  return (
    <div className="no-print">
      <button
        type="button"
        onClick={() => window.print()}
        className="
          block w-full max-w-[440px] mx-auto py-[14px] text-center
          bg-bwxt-navy text-white font-semibold text-[15px] rounded-[14px]
          hover:bg-bwxt-navy-dark transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-bwxt-navy focus:ring-offset-2
        "
      >
        {label}
      </button>
      {hint && (
        <p className="mt-2 text-center text-[13px] text-bwxt-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
