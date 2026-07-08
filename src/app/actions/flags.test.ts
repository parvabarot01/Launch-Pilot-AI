import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb, seedViewerContext, seedUserInOrg } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import { createFlagCore, updateFlagStateCore, archiveFlagCore, rollbackFlagCore } from "./flags";

test("createFlagCore: a member can create a flag, initialized across all environments", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const result = await createFlagCore(ctx, { key: "new-checkout", name: "New Checkout", description: "desc" });

  assert.equal(result.ok, true);
  const db = await readDb();
  assert.equal(db.flags.length, 1);
  assert.equal(db.flags[0].environments.length, 3);
  assert.ok(db.flags[0].environments.every((e) => e.rolloutPercentage === 0 && !e.enabled));
  assert.equal(db.auditLog.length, 1);
  assert.equal(db.auditLog[0].action, "flag.created");
});

test("createFlagCore: a viewer cannot create a flag", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("viewer");
  const result = await createFlagCore(ctx, { key: "nope", name: "Nope", description: "" });

  assert.equal(result.ok, false);
  assert.equal((await readDb()).flags.length, 0);
});

test("createFlagCore: rejects a duplicate key within the same org", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  await createFlagCore(ctx, { key: "dup-key", name: "First", description: "" });
  const second = await createFlagCore(ctx, { key: "dup-key", name: "Second", description: "" });

  assert.equal(second.ok, false);
  assert.equal((await readDb()).flags.length, 1);
});

test("createFlagCore: rejects an invalid key format", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  const result = await createFlagCore(ctx, { key: "Not Valid!", name: "X", description: "" });

  assert.equal(result.ok, false);
});

async function createTestFlag(ctx: Awaited<ReturnType<typeof seedViewerContext>>) {
  await createFlagCore(ctx, { key: "test-flag", name: "Test Flag", description: "" });
  return (await readDb()).flags[0];
}

test("updateFlagStateCore: a small rollout increase applies immediately and snapshots first", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const flag = await createTestFlag(ctx);

  const result = await updateFlagStateCore(ctx, flag.id, {
    environmentId: ctx.environment.id,
    enabled: true,
    rolloutPercentage: 20,
  });

  assert.equal(result.ok, true);
  assert.notEqual(result.approvalRequested, true);

  const db = await readDb();
  const state = db.flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.rolloutPercentage, 20);
  assert.equal(state.enabled, true);
  assert.equal(db.rollbackSnapshots.length, 1, "should snapshot the prior state before applying");
  assert.equal(db.approvals.length, 0, "small increase should not create an approval request");
});

test("updateFlagStateCore: a large rollout increase (>=50 points) requires approval instead of applying", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const flag = await createTestFlag(ctx);

  const result = await updateFlagStateCore(ctx, flag.id, {
    environmentId: ctx.environment.id,
    rolloutPercentage: 60,
  });

  assert.equal(result.ok, true);
  assert.equal(result.approvalRequested, true);

  const db = await readDb();
  const state = db.flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.rolloutPercentage, 0, "rollout must NOT have been applied yet");
  assert.equal(db.approvals.length, 1);
  assert.equal(db.approvals[0].status, "pending");
  assert.equal(db.approvals[0].toRolloutPercentage, 60);
  assert.ok(db.approvals[0].riskScore >= 0 && db.approvals[0].riskScore <= 100);
  assert.ok(db.auditLog.some((e) => e.action === "approval.requested"));
});

test("updateFlagStateCore: reaching exactly 100% always requires approval, regardless of jump size", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const flag = await createTestFlag(ctx);

  // Walk up to 95% in small (<50pt) steps that each apply directly, with
  // no approval requests, so the 95->100 step below isolates the "reaching
  // 100% requires approval" rule from the "jump size" rule.
  await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, rolloutPercentage: 40 });
  await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, rolloutPercentage: 80 });
  await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, rolloutPercentage: 95 });
  assert.equal((await readDb()).approvals.length, 0, "none of the small steps should have required approval");

  // Now go from 95% to 100% - a jump of only 5 points, but landing on 100%.
  const result = await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, rolloutPercentage: 100 });

  assert.equal(result.approvalRequested, true);
  const db = await readDb();
  const state = db.flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.rolloutPercentage, 95, "must still be at the pre-approval value");
});

test("updateFlagStateCore: kill switch toggles immediately without approval, even in production", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const flag = await createTestFlag(ctx);
  const prodEnv = ctx.environments.find((e) => e.key === "production")!;

  const result = await updateFlagStateCore(ctx, flag.id, { environmentId: prodEnv.id, killSwitch: true });

  assert.equal(result.ok, true);
  assert.notEqual(result.approvalRequested, true);
  const state = (await readDb()).flags[0].environments.find((e) => e.environmentId === prodEnv.id)!;
  assert.equal(state.killSwitch, true);
});

test("updateFlagStateCore: a viewer cannot change flag state", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const flag = await createTestFlag(owner);
  const viewerCtx = await seedUserInOrg(owner.org, owner.environments, "viewer");
  const result = await updateFlagStateCore(viewerCtx, flag.id, {
    environmentId: owner.environment.id,
    rolloutPercentage: 10,
  });

  assert.equal(result.ok, false);
});

test("updateFlagStateCore: targeting rules are persisted with generated ids", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const flag = await createTestFlag(ctx);

  const result = await updateFlagStateCore(ctx, flag.id, {
    environmentId: ctx.environment.id,
    targetingRules: [{ attribute: "plan", operator: "equals", value: "enterprise" }],
  });

  assert.equal(result.ok, true);
  const state = (await readDb()).flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.targetingRules.length, 1);
  assert.ok(state.targetingRules[0].id);
  assert.equal(state.targetingRules[0].attribute, "plan");
});

test("archiveFlagCore: admin can archive, member cannot", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const flag = await createTestFlag(owner);
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");

  const deniedResult = await archiveFlagCore(memberCtx, flag.id);
  assert.equal(deniedResult.ok, false);
  assert.equal((await readDb()).flags[0].archivedAt, null);

  const allowedResult = await archiveFlagCore(owner, flag.id);
  assert.equal(allowedResult.ok, true);
  assert.notEqual((await readDb()).flags[0].archivedAt, null);
  assert.ok((await readDb()).auditLog.some((e) => e.action === "flag.archived"));
});

test("rollbackFlagCore: restores a prior state and is audited", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  const flag = await createTestFlag(ctx);

  await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, enabled: true, rolloutPercentage: 30 });
  const snapshot = (await readDb()).rollbackSnapshots[0];
  assert.equal(snapshot.state.rolloutPercentage, 0, "snapshot captured the state BEFORE the change");

  // Change it again so there's something to roll back from.
  await updateFlagStateCore(ctx, flag.id, { environmentId: ctx.environment.id, rolloutPercentage: 40 });
  let state = (await readDb()).flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.rolloutPercentage, 40);

  const result = await rollbackFlagCore(ctx, snapshot.id);
  assert.equal(result.ok, true);

  state = (await readDb()).flags[0].environments.find((e) => e.environmentId === ctx.environment.id)!;
  assert.equal(state.rolloutPercentage, 0, "rolled back to the pre-change state");
  assert.ok((await readDb()).auditLog.some((e) => e.action === "rollback.performed"));
});

test("rollbackFlagCore: a member cannot roll back (admin/owner only)", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const flag = await createTestFlag(owner);
  await updateFlagStateCore(owner, flag.id, { environmentId: owner.environment.id, rolloutPercentage: 30 });
  const snapshot = (await readDb()).rollbackSnapshots[0];

  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");
  const result = await rollbackFlagCore(memberCtx, snapshot.id);

  assert.equal(result.ok, false);
});
