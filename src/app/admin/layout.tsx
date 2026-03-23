/**
 * Admin layout.
 * Provides the header banner and navigation shared across all admin routes.
 * Individual pages supply their own <main> and heading hierarchy.
 */

import AdminNav from "./AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-light">
      {/* ── Site header ─────────────────────────────────────────────────── */}
      <header className="bg-brand-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-brand-gold text-xs font-semibold uppercase tracking-wider">
              Admin
            </span>
            <span className="text-white/20" aria-hidden="true">
              |
            </span>
            <span className="text-white/70 text-sm font-medium">
              Operation Iron Horizon
            </span>
          </div>
          <span className="text-white/40 text-xs hidden sm:block">
            BWXT Leadership Academy
          </span>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <AdminNav />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
