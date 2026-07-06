import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchPilot — Feature flags, experiments, and release governance",
  description:
    "Ship faster and safer with unified feature flags, statistically-grounded A/B testing, and an AI decision layer for release governance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
