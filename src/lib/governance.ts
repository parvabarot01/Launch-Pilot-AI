import type { EnvironmentKey } from "./types";

export const GOVERNANCE_APPROVAL_THRESHOLD = 50; // rollout increases crossing this jump need approval

export interface RiskInput {
  fromPercentage: number;
  toPercentage: number;
  environmentKey: EnvironmentKey;
  hasActiveExperimentAttached: boolean;
  recentRollbackCount: number;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
  factors: string[];
}

export function computeRiskScore(input: RiskInput): RiskAssessment {
  const factors: string[] = [];
  let score = 0;

  const jump = input.toPercentage - input.fromPercentage;
  if (jump > 0) {
    const jumpScore = Math.min(40, jump * 0.4);
    score += jumpScore;
    if (jump >= 50) factors.push(`Large rollout jump of +${jump} points`);
  }

  if (input.environmentKey === "production") {
    score += 25;
    factors.push("Targeting production environment");
  } else if (input.environmentKey === "staging") {
    score += 10;
  }

  if (input.toPercentage === 100) {
    score += 10;
    factors.push("Rolling out to 100% of users");
  }

  if (!input.hasActiveExperimentAttached) {
    score += 10;
    factors.push("No experiment data backing this rollout decision");
  }

  if (input.recentRollbackCount > 0) {
    score += Math.min(20, input.recentRollbackCount * 10);
    factors.push(`${input.recentRollbackCount} rollback(s) recorded recently for this flag`);
  }

  score = Math.min(100, Math.round(score));

  let level: RiskAssessment["level"];
  if (score >= 75) level = "critical";
  else if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";
  else level = "low";

  return { score, level, factors };
}

export function requiresApproval(fromPercentage: number, toPercentage: number): boolean {
  return toPercentage - fromPercentage >= GOVERNANCE_APPROVAL_THRESHOLD || toPercentage === 100;
}
