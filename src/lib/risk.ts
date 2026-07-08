import type { RiskAssessment } from "./governance";
import type { AuditAction, ExperimentStatus } from "./types";
import type { ExperimentAnalysis } from "./ai";

export type RiskToken = "clear" | "watch" | "halt" | "inert";

const LEVEL_TO_TOKEN: Record<RiskAssessment["level"], RiskToken> = {
  low: "clear",
  medium: "watch",
  high: "halt",
  critical: "halt",
};

export function toRegisterToken(
  level: RiskAssessment["level"],
  opts: { inert?: boolean } = {}
): RiskToken {
  if (opts.inert) return "inert";
  return LEVEL_TO_TOKEN[level];
}

export const RISK_META: Record<RiskToken, { label: string; dots: number }> = {
  clear: { label: "Clear", dots: 1 },
  watch: { label: "Watch", dots: 3 },
  halt: { label: "Halt", dots: 5 },
  inert: { label: "Inert", dots: 0 },
};

export function scoreToDots(score: number): number {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

// Most audit rows are routine — only actions that signal a risk transition
// get a spine. Coloring every row would dilute the register the same way a
// category-colored flag row would.
const AUDIT_ACTION_TOKEN: Partial<Record<AuditAction, RiskToken>> = {
  "approval.rejected": "halt",
  "flag.kill_switch_toggled": "halt",
  "rollback.performed": "halt",
  "approval.requested": "watch",
  "approval.approved": "clear",
};

export function auditActionToken(action: AuditAction): RiskToken | null {
  return AUDIT_ACTION_TOKEN[action] ?? null;
}

const VERDICT_TOKEN: Record<ExperimentAnalysis["verdict"], RiskToken> = {
  ship_winner: "clear",
  no_effect: "watch",
  insufficient_data: "watch",
  keep_running: "inert",
};

export function verdictToken(verdict: ExperimentAnalysis["verdict"], status: ExperimentStatus): RiskToken {
  if (status === "draft" || status === "archived") return "inert";
  return VERDICT_TOKEN[verdict];
}

// Tailwind's class scanner needs literal strings — a template-interpolated
// class name (`border-risk-${token}`) never appears verbatim in source, so
// it gets purged. Hence the explicit lookup instead of string-building.
const SPINE_CLASS: Record<RiskToken, string> = {
  clear: "border-l-[3px] border-risk-clear",
  watch: "border-l-[3px] border-risk-watch",
  halt: "border-l-[3px] border-risk-halt",
  inert: "border-l-[3px] border-risk-inert",
};

// Apply to a row's first <td> (or a row-like block element), not <tr> —
// browsers don't reliably paint borders on table-row boxes.
export function riskSpineClass(token: RiskToken): string {
  return SPINE_CLASS[token];
}

export const RISK_DOT_BG: Record<RiskToken, string> = {
  clear: "bg-risk-clear",
  watch: "bg-risk-watch",
  halt: "bg-risk-halt",
  inert: "bg-risk-inert",
};

export const RISK_TEXT: Record<RiskToken, string> = {
  clear: "text-risk-clear",
  watch: "text-risk-watch",
  halt: "text-risk-halt",
  inert: "text-risk-inert",
};

export const RISK_WASH_BG: Record<RiskToken, string> = {
  clear: "bg-risk-clear-wash",
  watch: "bg-risk-watch-wash",
  halt: "bg-risk-halt-wash",
  inert: "bg-risk-inert-wash",
};
