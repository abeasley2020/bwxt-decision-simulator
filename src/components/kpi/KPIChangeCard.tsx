/**
 * KPIChangeCard
 *
 * Displays a single KPI's before/after values and delta.
 * Color is never the sole means of conveying change direction —
 * directional symbols (▲ ▼ =) and text labels are also provided.
 */

interface KPIChangeCardProps {
  label: string;
  before: number;
  after: number;
}

export default function KPIChangeCard({ label, before, after }: KPIChangeCardProps) {
  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  const deltaLabel = isPositive
    ? `Increased by ${delta}`
    : isNegative
    ? `Decreased by ${Math.abs(delta)}`
    : "No change";

  const deltaDisplay = isPositive
    ? `+${delta}`
    : isNegative
    ? `${delta}`
    : "0";

  const directionSymbol = isPositive ? "▲" : isNegative ? "▼" : "=";

  const deltaColorClass = isPositive
    ? "text-green-700 bg-green-50 border-green-200"
    : isNegative
    ? "text-red-700 bg-red-50 border-red-200"
    : "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-semibold text-gray-800 mb-3">{label}</div>

      {/* Before → After */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500 text-sm tabular-nums">{before}</span>
        <span className="text-gray-400 text-xs" aria-hidden="true">→</span>
        <span className="text-gray-900 font-bold text-sm tabular-nums">{after}</span>
        <span className="text-gray-400 text-xs">/ 100</span>
      </div>

      {/* Delta badge — color + symbol + text (WCAG 1.4.1) */}
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${deltaColorClass}`}
        aria-label={deltaLabel}
      >
        <span aria-hidden="true">{directionSymbol}</span>
        <span>{deltaDisplay}</span>
      </div>

      {/* Progress bar — decorative, aria-hidden */}
      <div className="mt-3" aria-hidden="true">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
          {/* Baseline marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-300 z-10"
            style={{ left: `${before}%` }}
          />
          {/* Current value fill */}
          <div
            className={`h-full rounded-full transition-all ${
              isPositive
                ? "bg-green-500"
                : isNegative
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
            style={{ width: `${after}%` }}
          />
        </div>
      </div>
    </div>
  );
}
