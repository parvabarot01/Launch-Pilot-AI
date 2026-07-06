import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRiskScore, requiresApproval, GOVERNANCE_APPROVAL_THRESHOLD } from "./governance";

test("small rollout increases do not require approval", () => {
  assert.equal(requiresApproval(10, 30), false);
});

test("increases at or above the threshold require approval", () => {
  assert.equal(requiresApproval(0, GOVERNANCE_APPROVAL_THRESHOLD), true);
  assert.equal(requiresApproval(20, 20 + GOVERNANCE_APPROVAL_THRESHOLD), true);
});

test("reaching 100% always requires approval, even from a small jump", () => {
  assert.equal(requiresApproval(95, 100), true);
});

test("risk score increases with production + large jump + no experiment + rollbacks", () => {
  const low = computeRiskScore({
    fromPercentage: 0,
    toPercentage: 10,
    environmentKey: "development",
    hasActiveExperimentAttached: true,
    recentRollbackCount: 0,
  });
  const high = computeRiskScore({
    fromPercentage: 0,
    toPercentage: 100,
    environmentKey: "production",
    hasActiveExperimentAttached: false,
    recentRollbackCount: 3,
  });
  assert.ok(high.score > low.score);
  assert.equal(low.level, "low");
  assert.equal(high.level, "critical");
});

test("risk score is always clamped to [0, 100]", () => {
  const score = computeRiskScore({
    fromPercentage: 0,
    toPercentage: 100,
    environmentKey: "production",
    hasActiveExperimentAttached: false,
    recentRollbackCount: 50,
  }).score;
  assert.ok(score >= 0 && score <= 100);
});

test("risk factors explain why the score is what it is", () => {
  const { factors } = computeRiskScore({
    fromPercentage: 10,
    toPercentage: 100,
    environmentKey: "production",
    hasActiveExperimentAttached: false,
    recentRollbackCount: 1,
  });
  assert.ok(factors.some((f) => f.toLowerCase().includes("production")));
  assert.ok(factors.some((f) => f.toLowerCase().includes("100%")));
  assert.ok(factors.some((f) => f.toLowerCase().includes("experiment")));
  assert.ok(factors.some((f) => f.toLowerCase().includes("rollback")));
});
