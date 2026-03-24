"use client";

/**
 * Admin navigation bar — client component.
 * usePathname() marks the active link.
 * Accepts userName from the server layout (fetched from public.users).
 * Mobile: hamburger drawer.
 * WCAG: aria-current="page" on active link; visible focus ring; keyboard accessible.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Overview",     href: "/admin",              exact: true  },
  { label: "Cohorts",      href: "/admin/cohorts",      exact: false },
  { label: "Participants", href: "/admin/participants", exact: false },
  { label: "Scenarios",    href: "/admin/scenarios",    exact: false },
  { label: "Settings",     href: "/admin/settings",     exact: false },
] as const;

interface AdminNavProps {
  userName: string;
}

export default function AdminNav({ userName }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      style={{ backgroundColor: "#17153A", height: "56px" }}
      className="w-full flex items-center px-6 relative"
    >
      {/* ── Wordmark ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center" style={{ minWidth: "160px" }}>
        <span
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            color: "#ffffff",
            letterSpacing: "-0.01em",
          }}
        >
          BWXT
        </span>
        <span
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "15px",
            color: "rgba(255,255,255,0.45)",
            marginLeft: "6px",
          }}
        >
          Admin
        </span>
      </div>

      {/* ── Desktop center nav ────────────────────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="hidden md:flex flex-1 justify-center items-stretch h-full"
      >
        <ul className="flex items-stretch h-full" role="list">
          {NAV_ITEMS.map(({ label, href, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={href} className="flex items-stretch">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                    borderBottom: active ? "2px solid #C93147" : "2px solid transparent",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                  }}
                  className="focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-inset"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Desktop right: user + logout ──────────────────────────────────── */}
      <div
        className="hidden md:flex items-center gap-4 flex-shrink-0"
        style={{ minWidth: "160px", justifyContent: "flex-end" }}
      >
        {userName && (
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {userName}
          </span>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "13px",
            color: "rgba(255,255,255,0.55)",
            background: "none",
            border: "none",
            cursor: signingOut ? "default" : "pointer",
            padding: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
          className="focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
      <div className="md:hidden ml-auto">
        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-9 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "56px",
            left: 0,
            right: 0,
            backgroundColor: "#17153A",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            zIndex: 50,
            paddingBottom: "8px",
          }}
        >
          {NAV_ITEMS.map(({ label, href, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                  borderLeft: active ? "3px solid #C93147" : "3px solid transparent",
                  backgroundColor: active ? "rgba(255,255,255,0.05)" : "transparent",
                  textDecoration: "none",
                }}
                className="focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-inset"
              >
                {label}
              </Link>
            );
          })}
          <div
            style={{
              margin: "8px 24px 4px",
              paddingTop: "8px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {userName && (
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                {userName}
              </span>
            )}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.55)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              className="focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
