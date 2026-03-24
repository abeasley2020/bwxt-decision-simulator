/**
 * SimulationNav
 *
 * Shared top navigation bar for all simulation pages.
 * 56px height, sticky, navy background.
 *
 * Props:
 *   roundLabel — optional round indicator, e.g. "Round 2 of 3"
 */

import SignOutButton from "@/components/SignOutButton";

interface SimulationNavProps {
  roundLabel?: string;
}

export default function SimulationNav({ roundLabel }: SimulationNavProps) {
  return (
    <nav
      aria-label="Simulation navigation"
      className="h-14 bg-bwxt-navy sticky top-0 z-10 flex items-center"
    >
      <div className="max-w-[880px] mx-auto px-6 w-full flex items-center justify-between">
        {/* Left: wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-playfair font-bold text-[20px] text-white leading-none">
            BWXT
          </span>
          <div className="w-px h-4 bg-white/20" aria-hidden="true" />
          <span className="text-[13px] text-white/60 font-normal">
            Leadership Academy
          </span>
        </div>

        {/* Right: round label pill + sign out */}
        <div className="flex items-center gap-4">
          {roundLabel && (
            <div
              aria-label={roundLabel}
              className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white text-[13px] font-medium"
            >
              {roundLabel}
            </div>
          )}
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
