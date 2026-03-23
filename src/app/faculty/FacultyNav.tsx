"use client";

/**
 * Faculty navigation bar.
 * Client component so usePathname() can mark the active link.
 * WCAG: aria-current="page" on active link; visible focus ring; keyboard accessible.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/faculty/dashboard" },
  { label: "Participants", href: "/faculty/participants" },
  { label: "Decision Patterns", href: "/faculty/decisions" },
] as const;

export default function FacultyNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Faculty navigation">
      <ul className="flex" role="list">
        {NAV_ITEMS.map(({ label, href }) => {
          // /faculty/participants/[userId] should highlight Participants
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  inline-block px-4 py-3 text-sm font-medium transition-colors duration-100
                  border-b-2
                  focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-inset
                  ${
                    isActive
                      ? "text-white border-brand-gold"
                      : "text-white/60 border-transparent hover:text-white hover:border-white/30"
                  }
                `}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
