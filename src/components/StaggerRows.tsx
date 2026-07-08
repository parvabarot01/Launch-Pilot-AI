import type { ReactNode } from "react";

const STAGGER_CAP = 12;
const STAGGER_STEP_MS = 20;

// Wraps a single row so it fades/slides in on mount, staggered by index.
// Capped at STAGGER_CAP so a long list doesn't make row 40 wait 800ms.
export function StaggerRow({ index, as: Component = "div", className = "", children }: {
  index: number;
  as?: "div" | "tr";
  className?: string;
  children: ReactNode;
}) {
  const delay = Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS;
  return (
    <Component className={`animate-fade-in-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </Component>
  );
}
