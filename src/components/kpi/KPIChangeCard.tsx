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
    ? "text-bwxt-success bg-green-50 border-green-200"
    : isNegative
    ? "text-bwxt-danger bg-bwxt-crimson-light border-bwxt-crimson/20"
    : "text-bwxt-text-muted bg-bwxt-border/40 border-bwxt-border";

  const fillColorClass = isPositive
    ? "bg-bwxt-success"
    : isNegative
    ? "bg-bwxt-danger"
    : "bg-bwxt-text-muted";

  return (
    <div className="bg-white border border-bwxt-border rounded-xl shadow-card p-4">
      <div className="text-[12px] font-medium text-bwxt-text-muted uppercase tracking-[0.05em] mb-3">{label}</div>

      {/* Before → After */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-bwxt-text-muted text-[14px] tabular-nums">{before}</span>
        <span className="text-bwxt-border text-xs" aria-hidden="true">→</span>
        <span className="text-bwxt-navy font-bold text-[14px] tabular-nums">{after}</span>
        <span className="text-bwxt-text-muted text-[12px]">/ 100</span>
      </div>

      {/* Delta badge — color + symbol + text (WCAG 1.4.1) */}
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[12px] font-semibold ${deltaColorClass}`}
        aria-label={deltaLabel}
      >
        <span aria-hidden="true">{directionSymbol}</span>
        <span>{deltaDisplay}</span>
      </div>

      {/* Progress bar — decorative, aria-hidden */}
      <div className="mt-3 h-[4px] bg-bwxt-border rounded-full overflow-hidden relative" aria-hidden="true">
        {/* Baseline marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-bwxt-text-muted z-10"
          style={{ left: `${before}%` }}
        />
        {/* Current value fill */}
        <div
          className={`h-full rounded-full transition-all ${fillColorClass}`}
          style={{ width: `${after}%` }}
        />
      </div>
    </div>
  );
}
