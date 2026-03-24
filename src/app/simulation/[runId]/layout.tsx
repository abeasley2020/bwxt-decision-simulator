/**
 * Simulation run layout.
 *
 * Provides the SimulationNav to every page under /simulation/[runId]/*
 * so individual pages do not need to import or render it themselves.
 * The nav is sticky and sits above all page content.
 */

import SimulationNav from "@/components/SimulationNav";

export default function SimulationRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SimulationNav />
      {children}
    </>
  );
}
