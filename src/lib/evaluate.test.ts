import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFlagState } from "./evaluate";
import type { FlagEnvironmentState } from "./types";

function state(overrides: Partial<FlagEnvironmentState> = {}): FlagEnvironmentState {
  return {
    environmentId: "env_1",
    enabled: true,
    killSwitch: false,
    rolloutPercentage: 100,
    targetingRules: [],
    updatedAt: new Date().toISOString(),
    updatedBy: "user_1",
    ...overrides,
  };
}

test("missing flag state evaluates to disabled", () => {
  const result = evaluateFlagState(undefined, "my-flag", "user-1");
  assert.equal(result.enabled, false);
  assert.equal(result.reason, "no_flag");
});

test("kill switch always wins, even at 100% rollout", () => {
  const result = evaluateFlagState(state({ killSwitch: true }), "my-flag", "user-1");
  assert.equal(result.enabled, false);
  assert.equal(result.reason, "kill_switch");
});

test("disabled flag is off regardless of rollout percentage", () => {
  const result = evaluateFlagState(state({ enabled: false, rolloutPercentage: 100 }), "my-flag", "user-1");
  assert.equal(result.enabled, false);
  assert.equal(result.reason, "flag_disabled");
});

test("0% rollout is off for everyone absent a targeting rule", () => {
  const result = evaluateFlagState(state({ rolloutPercentage: 0 }), "my-flag", "user-1");
  assert.equal(result.enabled, false);
  assert.equal(result.reason, "rollout_bucket");
});

test("100% rollout is on for everyone", () => {
  for (const id of ["user-1", "user-2", "anon-xyz"]) {
    const result = evaluateFlagState(state({ rolloutPercentage: 100 }), "my-flag", id);
    assert.equal(result.enabled, true);
    assert.equal(result.reason, "rollout_bucket");
  }
});

test("evaluation is deterministic for the same subject and flag", () => {
  const s = state({ rolloutPercentage: 50 });
  const first = evaluateFlagState(s, "my-flag", "stable-user");
  for (let i = 0; i < 10; i++) {
    const again = evaluateFlagState(s, "my-flag", "stable-user");
    assert.equal(again.enabled, first.enabled);
  }
});

test("a matching targeting rule forces the flag on even at 0% rollout", () => {
  const s = state({
    rolloutPercentage: 0,
    targetingRules: [{ id: "rule_1", attribute: "plan", operator: "equals", value: "enterprise" }],
  });
  const result = evaluateFlagState(s, "my-flag", "user-1", { plan: "enterprise" });
  assert.equal(result.enabled, true);
  assert.equal(result.reason, "targeting_rule");
});

test("a non-matching targeting rule falls through to rollout bucketing", () => {
  const s = state({
    rolloutPercentage: 0,
    targetingRules: [{ id: "rule_1", attribute: "plan", operator: "equals", value: "enterprise" }],
  });
  const result = evaluateFlagState(s, "my-flag", "user-1", { plan: "free" });
  assert.equal(result.enabled, false);
  assert.equal(result.reason, "rollout_bucket");
});

test("targeting rule operators: gt/lt/contains/in/not_equals behave as expected", () => {
  const gt = state({ rolloutPercentage: 0, targetingRules: [{ id: "r", attribute: "age", operator: "gt", value: "18" }] });
  assert.equal(evaluateFlagState(gt, "f", "u", { age: "21" }).enabled, true);
  assert.equal(evaluateFlagState(gt, "f", "u", { age: "10" }).enabled, false);

  const contains = state({ rolloutPercentage: 0, targetingRules: [{ id: "r", attribute: "email", operator: "contains", value: "@acme.com" }] });
  assert.equal(evaluateFlagState(contains, "f", "u", { email: "a@acme.com" }).enabled, true);

  const inList = state({ rolloutPercentage: 0, targetingRules: [{ id: "r", attribute: "region", operator: "in", value: "us,eu,uk" }] });
  assert.equal(evaluateFlagState(inList, "f", "u", { region: "eu" }).enabled, true);
  assert.equal(evaluateFlagState(inList, "f", "u", { region: "apac" }).enabled, false);

  const notEquals = state({ rolloutPercentage: 0, targetingRules: [{ id: "r", attribute: "plan", operator: "not_equals", value: "free" }] });
  assert.equal(evaluateFlagState(notEquals, "f", "u", { plan: "pro" }).enabled, true);
  assert.equal(evaluateFlagState(notEquals, "f", "u", { plan: "free" }).enabled, false);
});
