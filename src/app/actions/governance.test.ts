import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb, seedViewerContext, seedUserInOrg } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import { createFlagCore, updateFlagStateCore } from "./flags";
import { decideApprovalCore } from "./governance";

async function seedPendingApproval(ownerCtx: Awaited<ReturnType<typeof seedViewerContext>>) {
  await createFlagCore(ownerCtx, { key: "big-rollout", name: "Big Rollout", description: "" });
  const flag = readDb().flags[0];
  await updateFlagStateCore(ownerCtx, flag.id, { environmentId: ownerCtx.environment.id, rolloutPercentage: 75 });
  const approval = readDb().approvals[0];
  return { flag, approval };
}

test("decideApprovalCore: approving applies the rollout and snapshots the prior state", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { flag, approval } = await seedPendingApproval(owner);

  const result = await decideApprovalCore(owner, approval.id, "approved");

  assert.equal(result.ok, true);
  const db = readDb();
  assert.equal(db.approvals[0].status, "approved");
  assert.equal(db.approvals[0].reviewedBy, owner.user.id);
  const state = db.flags.find((f) => f.id === flag.id)!.environments.find((e) => e.environmentId === owner.environment.id)!;
  assert.equal(state.rolloutPercentage, 75, "approval should apply the originally-requested percentage");
  assert.ok(db.rollbackSnapshots.length > 0, "approving should snapshot the pre-approval state for rollback");
  assert.ok(db.auditLog.some((e) => e.action === "approval.approved"));
});

test("decideApprovalCore: rejecting does not change the rollout percentage", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { flag, approval } = await seedPendingApproval(owner);

  const result = await decideApprovalCore(owner, approval.id, "rejected");

  assert.equal(result.ok, true);
  const state = readDb()
    .flags.find((f) => f.id === flag.id)!
    .environments.find((e) => e.environmentId === owner.environment.id)!;
  assert.equal(state.rolloutPercentage, 0, "rejection must not apply the requested change");
  assert.equal(readDb().approvals[0].status, "rejected");
  assert.ok(readDb().auditLog.some((e) => e.action === "approval.rejected"));
});

test("decideApprovalCore: a member cannot decide (admin/owner only)", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { approval } = await seedPendingApproval(owner);
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");

  const result = await decideApprovalCore(memberCtx, approval.id, "approved");

  assert.equal(result.ok, false);
  assert.equal(readDb().approvals[0].status, "pending");
});

test("decideApprovalCore: an admin (not just the owner) can decide", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { approval } = await seedPendingApproval(owner);
  const adminCtx = await seedUserInOrg(owner.org, owner.environments, "admin");

  const result = await decideApprovalCore(adminCtx, approval.id, "approved");

  assert.equal(result.ok, true);
});

test("decideApprovalCore: cannot decide the same request twice", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { approval } = await seedPendingApproval(owner);

  const first = await decideApprovalCore(owner, approval.id, "approved");
  const second = await decideApprovalCore(owner, approval.id, "rejected");

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.match(second.error!, /already reviewed/i);
  assert.equal(readDb().approvals[0].status, "approved", "the first decision must stick");
});

test("decideApprovalCore: rejects a garbage decision value at runtime", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const { approval } = await seedPendingApproval(owner);

  // @ts-expect-error deliberately passing an invalid value to prove the runtime guard works
  const result = await decideApprovalCore(owner, approval.id, "maybe");

  assert.equal(result.ok, false);
  assert.equal(readDb().approvals[0].status, "pending");
});
