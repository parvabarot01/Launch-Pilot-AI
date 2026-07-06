import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb, seedViewerContext, seedUserInOrg } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import {
  createExperimentCore,
  changeExperimentStatusCore,
  recordEventCore,
  simulateTrafficCore,
  type CreateExperimentInput,
} from "./experiments";

function baseInput(environmentId: string, overrides: Partial<CreateExperimentInput> = {}): CreateExperimentInput {
  return {
    environmentId,
    flagId: null,
    name: "Checkout lift test",
    hypothesis: "One-page checkout increases conversion",
    successMetric: "Purchase conversion rate",
    minimumSampleSize: 1000,
    variants: [
      { key: "control", name: "Control", allocationPercentage: 50, isControl: true },
      { key: "treatment", name: "Treatment", allocationPercentage: 50, isControl: false },
    ],
    ...overrides,
  };
}

test("createExperimentCore: a member can create a valid experiment", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const result = await createExperimentCore(ctx, baseInput(ctx.environment.id));

  assert.equal(result.ok, true);
  const db = readDb();
  assert.equal(db.experiments.length, 1);
  assert.equal(db.experiments[0].status, "draft");
  assert.equal(db.experiments[0].variants.length, 2);
  assert.ok(db.auditLog.some((e) => e.action === "experiment.created"));
});

test("createExperimentCore: a viewer cannot create an experiment", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("viewer");
  const result = await createExperimentCore(ctx, baseInput(ctx.environment.id));

  assert.equal(result.ok, false);
  assert.equal(readDb().experiments.length, 0);
});

test("createExperimentCore: rejects variant allocations that don't sum to 100", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  const result = await createExperimentCore(
    ctx,
    baseInput(ctx.environment.id, {
      variants: [
        { key: "control", name: "Control", allocationPercentage: 50, isControl: true },
        { key: "treatment", name: "Treatment", allocationPercentage: 30, isControl: false },
      ],
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.error!, /100%/);
});

test("createExperimentCore: rejects an experiment with no control variant", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  const result = await createExperimentCore(
    ctx,
    baseInput(ctx.environment.id, {
      variants: [
        { key: "a", name: "A", allocationPercentage: 50, isControl: false },
        { key: "b", name: "B", allocationPercentage: 50, isControl: false },
      ],
    })
  );

  assert.equal(result.ok, false);
  assert.match(result.error!, /control/i);
});

async function createTestExperiment(ctx: Awaited<ReturnType<typeof seedViewerContext>>) {
  await createExperimentCore(ctx, baseInput(ctx.environment.id));
  return readDb().experiments[0];
}

test("changeExperimentStatusCore: draft -> running sets startedAt, is audited", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const experiment = await createTestExperiment(ctx);

  const result = await changeExperimentStatusCore(ctx, experiment.id, "running");

  assert.equal(result.ok, true);
  const updated = readDb().experiments[0];
  assert.equal(updated.status, "running");
  assert.ok(updated.startedAt);
  assert.equal(updated.endedAt, null);
  assert.ok(readDb().auditLog.some((e) => e.action === "experiment.status_changed"));
});

test("changeExperimentStatusCore: running -> completed sets endedAt", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const experiment = await createTestExperiment(ctx);
  await changeExperimentStatusCore(ctx, experiment.id, "running");

  await changeExperimentStatusCore(ctx, experiment.id, "completed");

  const updated = readDb().experiments[0];
  assert.equal(updated.status, "completed");
  assert.ok(updated.endedAt);
});

test("changeExperimentStatusCore: rejects a garbage status value at runtime", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("owner");
  const experiment = await createTestExperiment(ctx);

  // @ts-expect-error deliberately passing an invalid value to prove the runtime guard works
  const result = await changeExperimentStatusCore(ctx, experiment.id, "hacked");

  assert.equal(result.ok, false);
  assert.equal(readDb().experiments[0].status, "draft", "status must not have been corrupted");
});

test("changeExperimentStatusCore: a viewer cannot change status", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const experiment = await createTestExperiment(owner);
  const viewerCtx = await seedUserInOrg(owner.org, owner.environments, "viewer");

  const result = await changeExperimentStatusCore(viewerCtx, experiment.id, "running");

  assert.equal(result.ok, false);
  assert.equal(readDb().experiments[0].status, "draft");
});

test("recordEventCore: any signed-in member can record an event (no role gate)", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const experiment = await createTestExperiment(owner);
  const viewerCtx = await seedUserInOrg(owner.org, owner.environments, "viewer");

  const result = await recordEventCore(viewerCtx, {
    experimentId: experiment.id,
    variantId: experiment.variants[0].id,
    eventType: "exposure",
    subjectId: "user-1",
  });

  assert.equal(result.ok, true);
  assert.equal(readDb().events.length, 1);
});

test("recordEventCore: events for a nonexistent experiment are silently dropped, not errored", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const result = await recordEventCore(ctx, {
    experimentId: "exp_does_not_exist",
    variantId: "var_x",
    eventType: "exposure",
    subjectId: "user-1",
  });

  assert.equal(result.ok, true);
  assert.equal(readDb().events.length, 0);
});

test("simulateTrafficCore: generates exposures and conversions per variant, member+ only", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const ctx = await seedViewerContext("member");
  const experiment = await createTestExperiment(ctx);

  const result = await simulateTrafficCore(ctx, experiment.id, 50);

  assert.equal(result.ok, true);
  const events = readDb().events;
  const exposures = events.filter((e) => e.eventType === "exposure");
  assert.equal(exposures.length, 100, "50 exposures per variant x 2 variants");
  // Every exposure/conversion pair should reference one of the experiment's real variant ids.
  const variantIds = new Set(experiment.variants.map((v) => v.id));
  assert.ok(events.every((e) => variantIds.has(e.variantId)));
});

test("simulateTrafficCore: a viewer cannot generate simulated traffic", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const experiment = await createTestExperiment(owner);
  const viewerCtx = await seedUserInOrg(owner.org, owner.environments, "viewer");

  const result = await simulateTrafficCore(viewerCtx, experiment.id, 50);

  assert.equal(result.ok, false);
  assert.equal(readDb().events.length, 0);
});
