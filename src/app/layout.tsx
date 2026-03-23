import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BWXT Enterprise Decision Simulator",
  description: "BWXT Leadership Academy — Executive Decision Simulation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
