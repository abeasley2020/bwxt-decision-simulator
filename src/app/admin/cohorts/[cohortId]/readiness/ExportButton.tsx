"use client";

/**
 * ExportButton — placeholder CSV export control.
 *
 * Shows an inline "Export coming soon" notice after click.
 * The notice auto-dismisses after 3 seconds.
 *
 * WCAG: role="status" + aria-live="polite" on the notice so screen readers
 * announce it without interrupting the user; aria-describedby links the
 * button to the notice when visible.
 */

import { useState } from "react";

export default function ExportButton() {
  const [visible, setVisible] = useState(false);

  function handleClick() {
    setVisible(true);
    setTimeout(() => setVisible(false), 3000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-describedby={visible ? "export-notice" : undefined}
        className="
          px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md
          hover:border-gray-400 transition-colors
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
        "
      >
        Export CSV
      </button>

      {visible && (
        <p
          id="export-notice"
          role="status"
          aria-live="polite"
          className="
            absolute right-0 top-full mt-1.5 z-10
            text-xs text-gray-700 bg-white border border-gray-200
            rounded-md px-3 py-2 shadow-sm whitespace-nowrap
          "
        >
          Export coming soon
        </p>
      )}
    </div>
  );
}
