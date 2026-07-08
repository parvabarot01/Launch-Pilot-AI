import { RISK_DOT_BG, RISK_META, scoreToDots, type RiskToken } from "@/lib/risk";

export function RiskDots({ token, score }: { token: RiskToken; score?: number }) {
  const dots = typeof score === "number" ? scoreToDots(score) : RISK_META[token].dots;
  const title = typeof score === "number" ? `${score}/100 · ${RISK_META[token].label}` : RISK_META[token].label;

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < dots ? RISK_DOT_BG[token] : "bg-rule"}`}
          />
        ))}
      </span>
      <span className="text-xs text-mute">{RISK_META[token].label}</span>
    </span>
  );
}
