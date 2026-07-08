"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";

interface FlowNode {
  number: string;
  title: string;
  body: string;
  note: string;
}

const NODES: FlowNode[] = [
  {
    number: "01",
    title: "Define",
    body: "Create a flag. Name it after the thing users see, not the code path.",
    note: "Every flag starts at 0% and inert. Nothing ships by existing.",
  },
  {
    number: "02",
    title: "Roll out",
    body: "Move the percentage. Target a cohort. The flag is live for exactly who you said.",
    note: "Rollout is a dial, not a switch. You are never one click from everyone.",
  },
  {
    number: "03",
    title: "Measure",
    body: "An experiment attaches and watches the metrics you care about.",
    note: "Guardrails watch the metrics you'd rather not think about. If one trips, the flag halts itself.",
  },
  {
    number: "04",
    title: "Approve",
    body: "Above a risk threshold, the flag stops and waits for a human who isn't you.",
    note: "Approval is a person, not a checkbox. The chain is recorded before the change lands.",
  },
  {
    number: "05",
    title: "Prove",
    body: "Every state change writes an immutable entry: who, what, when, from what value.",
    note: "The audit log is the artifact you hand to a regulator. It cannot be edited, including by you.",
  },
];

const RAIL_GRADIENT_HORIZONTAL =
  "linear-gradient(to right, var(--risk-inert) 0%, var(--brand) 25%, var(--brand) 60%, var(--risk-watch) 80%, var(--risk-clear) 100%)";
const RAIL_GRADIENT_VERTICAL =
  "linear-gradient(to bottom, var(--risk-inert) 0%, var(--brand) 25%, var(--brand) 60%, var(--risk-watch) 80%, var(--risk-clear) 100%)";

function Node({
  node,
  index,
  visible,
  compact,
  action,
}: {
  node: FlowNode;
  index: number;
  visible: boolean;
  compact?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex-1 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      style={{ transitionDelay: `${Math.min(index, 12) * 80}ms` }}
    >
      <p className="font-mono text-data text-mute">{node.number}</p>
      <h3 className={`mt-1 font-semibold text-ink ${compact ? "text-sm" : "text-section-head"}`}>{node.title}</h3>
      <p className={`mt-1 text-slate ${compact ? "text-xs" : "text-sm"}`}>{node.body}</p>
      {!compact && <p className="mt-2 text-xs italic text-mute">{node.note}</p>}
      {action}
    </div>
  );
}

export function HowItWorksFlow({
  orientation = "horizontal",
  compact = false,
  defineAction,
}: {
  orientation?: "horizontal" | "vertical";
  compact?: boolean;
  defineAction?: ReactNode;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  const isVertical = orientation === "vertical";

  return (
    <div ref={ref} className="w-full">
      <div className={isVertical ? "flex gap-6" : "flex flex-col gap-6"}>
        <div
          aria-hidden="true"
          className={isVertical ? "w-[3px] shrink-0 self-stretch rounded-full" : "h-[3px] w-full rounded-full"}
          style={{ background: isVertical ? RAIL_GRADIENT_VERTICAL : RAIL_GRADIENT_HORIZONTAL }}
        />
        <div className={isVertical ? "flex flex-1 flex-col gap-6" : "grid flex-1 grid-cols-1 gap-6 sm:grid-cols-5"}>
          {NODES.map((node, i) => (
            <Node
              key={node.number}
              node={node}
              index={i}
              visible={visible}
              compact={compact}
              action={i === 0 ? defineAction : undefined}
            />
          ))}
        </div>
      </div>

      <div
        className={`mt-6 flex items-start gap-3 border-t border-rule pt-6 transition-all duration-500 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        style={{ transitionDelay: `${Math.min(NODES.length, 12) * 80}ms` }}
      >
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-risk-halt" aria-hidden="true" />
        <div>
          <h3 className={`font-semibold text-risk-halt ${compact ? "text-sm" : "text-section-head"}`}>Rollback</h3>
          <p className={`mt-1 text-slate ${compact ? "text-xs" : "text-sm"}`}>
            Any state, any time, one action. The previous value is always in reach.
          </p>
          {!compact && <p className="mt-2 text-xs italic text-mute">Rolling back is not a failure mode. It's step 02 in reverse.</p>}
        </div>
      </div>
    </div>
  );
}
