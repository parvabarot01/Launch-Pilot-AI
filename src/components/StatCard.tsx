"use client";

import Link from "next/link";
import { useCountUp } from "@/lib/useCountUp";
import { riskSpineClass, type RiskToken } from "@/lib/risk";
import { Sparkline } from "@/components/Sparkline";

export function StatCard({
  label,
  value,
  href,
  token,
  sparkline,
  headline,
}: {
  label: string;
  value: number;
  href: string;
  token: RiskToken;
  sparkline?: number[];
  headline?: boolean;
}) {
  const animated = useCountUp(value);

  return (
    <Link
      href={href}
      style={
        headline
          ? { background: `linear-gradient(to bottom, var(--risk-${token}), color-mix(in srgb, var(--risk-${token}) 100%, white 40%))` }
          : undefined
      }
      className={`card block transition-colors duration-150 ${headline ? "border-l-[3px] border-transparent" : `hover:bg-wash ${riskSpineClass(token)}`}`}
    >
      <p className={`text-eyebrow uppercase ${headline ? "text-white/80" : "text-mute"}`}>{label}</p>
      <p className={`mt-1 font-mono text-stat-figure ${headline ? "text-white" : "text-ink"}`}>{animated}</p>
      {sparkline && sparkline.length > 1 && (
        <div className={headline ? "mt-2 opacity-90" : "mt-2"}>
          <Sparkline values={sparkline} stroke={headline ? "white" : token} />
        </div>
      )}
    </Link>
  );
}
