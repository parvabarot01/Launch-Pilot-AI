import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb, seedViewerContext, seedUserInOrg } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import { regenerateApiKeyCore } from "./environments";

test("regenerateApiKeyCore: an admin can rotate a key; old key stops matching", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const env = owner.environment;
  const oldKey = env.apiKey;

  const result = await regenerateApiKeyCore(owner, env.id);

  assert.equal(result.ok, true);
  const updated = (await readDb()).environments.find((e) => e.id === env.id)!;
  assert.notEqual(updated.apiKey, oldKey);
  assert.ok(updated.apiKey.startsWith("lp_"));
});

test("regenerateApiKeyCore: a member cannot rotate a key (admin/owner only)", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const memberCtx = await seedUserInOrg(owner.org, owner.environments, "member");
  const env = owner.environment;
  const oldKey = env.apiKey;

  const result = await regenerateApiKeyCore(memberCtx, env.id);

  assert.equal(result.ok, false);
  assert.equal((await readDb()).environments.find((e) => e.id === env.id)!.apiKey, oldKey);
});

test("regenerateApiKeyCore: audit entry never contains the full old or new key", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const env = owner.environment;

  await regenerateApiKeyCore(owner, env.id);

  const entry = (await readDb()).auditLog.find((e) => e.action === "environment.api_key_regenerated")!;
  assert.ok(entry);
  const serialized = JSON.stringify(entry);
  const newKey = (await readDb()).environments.find((e) => e.id === env.id)!.apiKey;
  assert.equal(serialized.includes(newKey), false, "full new key must never be written to the audit log");
});

test("regenerateApiKeyCore: rejects an unknown environment id", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const owner = await seedViewerContext("owner");
  const result = await regenerateApiKeyCore(owner, "env_does_not_exist");

  assert.equal(result.ok, false);
});
