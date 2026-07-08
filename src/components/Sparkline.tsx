const STROKE_CLASS = {
  clear: "stroke-risk-clear",
  watch: "stroke-risk-watch",
  halt: "stroke-risk-halt",
  inert: "stroke-risk-inert",
  ship: "stroke-chrome-ship",
  oversee: "stroke-chrome-oversee",
  white: "stroke-white",
} as const;

export function Sparkline({ values, stroke = "inert" }: { values: number[]; stroke?: keyof typeof STROKE_CLASS }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;

  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={`${STROKE_CLASS[stroke]} animate-draw-stroke`}
        style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
      />
    </svg>
  );
}
