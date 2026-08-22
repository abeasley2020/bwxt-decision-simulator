"use client";

/**
 * Route-level error boundary.
 *
 * Server components throw DataAccessError when a query fails rather than
 * rendering partial or misleading data. This boundary turns that into a
 * readable page with a retry action instead of a blank screen.
 *
 * WCAG: role="alert" so the failure is announced, retry is a real button,
 * failure conveyed by heading text rather than colour alone.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-bwxt-bg flex items-center justify-center px-6">
      <div
        role="alert"
        className="max-w-md w-full bg-white border border-bwxt-border rounded-xl shadow-card p-6"
      >
        <h1 className="font-playfair font-bold text-[22px] text-bwxt-navy">
          Something went wrong
        </h1>
        <p className="text-[15px] text-bwxt-text-secondary mt-2 leading-[1.65]">
          We could not load this page. Your progress has been saved. Try again,
          and if the problem continues contact your program administrator.
        </p>
        {error.digest && (
          <p className="text-[13px] text-bwxt-text-muted mt-2">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="
              bg-bwxt-navy text-white text-[15px] font-semibold px-4 py-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-2
            "
          >
            Try again
          </button>
          <Link
            href="/"
            className="
              text-[15px] font-semibold text-bwxt-navy underline
              focus:outline-none focus:ring-2 focus:ring-bwxt-crimson focus:ring-offset-2 rounded
            "
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
