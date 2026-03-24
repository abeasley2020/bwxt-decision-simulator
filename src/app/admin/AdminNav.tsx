"use client";

/**
 * Admin navigation bar.
 * Client component so usePathname() can mark the active link.
 * Mobile: collapses to a hamburger menu.
 * WCAG: aria-current="page" on active link; visible focus ring; keyboard accessible.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Cohorts",   href: "/admin/cohorts"   },
] as const;

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────────── */}
      <nav aria-label="Admin navigation" className="hidden md:block">
        <ul className="flex" role="list">
          {NAV_ITEMS.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`
                  inline-block px-4 py-3 text-sm font-medium transition-colors duration-150
                  border-b-2
                  focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-inset
                  ${
                    isActive(href)
                      ? "text-white border-[#C93147]"
                      : "text-white/60 border-transparent hover:text-white/90 hover:border-white/20"
                  }
                `}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Mobile hamburger ────────────────────────────────── */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-9 my-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {open ? (
            // Close icon
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            // Hamburger icon
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {open && (
          <div role="menu" className="pb-2">
            {NAV_ITEMS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                aria-current={isActive(href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150
                  border-l-2
                  focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-inset
                  ${
                    isActive(href)
                      ? "text-white border-[#C93147] bg-white/5"
                      : "text-white/60 border-transparent hover:text-white/90 hover:bg-white/5"
                  }
                `}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
