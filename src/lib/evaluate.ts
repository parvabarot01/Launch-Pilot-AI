import crypto from "crypto";
import type { FlagEnvironmentState, TargetingRule } from "./types";

/** Deterministic 0-99 bucket for a subject, stable across evaluations. */
function bucketFor(subjectId: string, flagKey: string): number {
  const hash = crypto.createHash("md5").update(`${flagKey}:${subjectId}`).digest("hex");
  const int = parseInt(hash.slice(0, 8), 16);
  return int % 100;
}

function ruleMatches(rule: TargetingRule, context: Record<string, string>): boolean {
  const actual = context[rule.attribute];
  if (actual === undefined) return false;

  switch (rule.operator) {
    case "equals":
      return actual === rule.value;
    case "not_equals":
      return actual !== rule.value;
    case "contains":
      return actual.includes(rule.value);
    case "in":
      return rule.value.split(",").map((v) => v.trim()).includes(actual);
    case "gt":
      return Number(actual) > Number(rule.value);
    case "lt":
      return Number(actual) < Number(rule.value);
    default:
      return false;
  }
}

export interface EvaluationResult {
  enabled: boolean;
  reason: "kill_switch" | "flag_disabled" | "targeting_rule" | "rollout_bucket" | "no_flag";
}

export function evaluateFlagState(
  state: FlagEnvironmentState | undefined,
  flagKey: string,
  subjectId: string,
  context: Record<string, string> = {}
): EvaluationResult {
  if (!state) return { enabled: false, reason: "no_flag" };
  if (state.killSwitch) return { enabled: false, reason: "kill_switch" };
  if (!state.enabled) return { enabled: false, reason: "flag_disabled" };

  for (const rule of state.targetingRules) {
    if (ruleMatches(rule, context)) {
      return { enabled: true, reason: "targeting_rule" };
    }
  }

  const bucket = bucketFor(subjectId, flagKey);
  return { enabled: bucket < state.rolloutPercentage, reason: "rollout_bucket" };
}
