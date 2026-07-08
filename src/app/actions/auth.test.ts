import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDb } from "@/lib/testFixtures";
import { readDb } from "@/lib/db";
import { resolveSignup, resolveLogin } from "./auth";

test("resolveSignup creates a user, org, owner membership, and three environments", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const result = await resolveSignup({
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "correcthorsebatterystaple",
    orgName: "Analytical Engines Inc",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const db = await readDb();
  assert.equal(db.users.length, 1);
  assert.equal(db.users[0].email, "ada@example.com");
  assert.equal(db.organizations.length, 1);
  assert.equal(db.organizations[0].name, "Analytical Engines Inc");
  assert.equal(db.memberships.length, 1);
  assert.equal(db.memberships[0].role, "owner");
  assert.equal(db.environments.length, 3);
  assert.deepEqual(
    db.environments.map((e) => e.key).sort(),
    ["development", "production", "staging"]
  );
  // Every environment gets its own distinct API key.
  assert.equal(new Set(db.environments.map((e) => e.apiKey)).size, 3);
});

test("resolveSignup rejects a duplicate email", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  await resolveSignup({ name: "A", email: "dup@example.com", password: "password123", orgName: "Org A" });
  const second = await resolveSignup({ name: "B", email: "dup@example.com", password: "password456", orgName: "Org B" });

  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.match(second.error, /already exists/i);

  const db = await readDb();
  assert.equal(db.users.length, 1, "second signup must not have created a user");
});

test("resolveSignup rejects invalid input (short password) without touching the db", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const result = await resolveSignup({ name: "A", email: "short@example.com", password: "short", orgName: "Org" });
  assert.equal(result.ok, false);

  const db = await readDb();
  assert.equal(db.users.length, 0);
});

test("resolveLogin succeeds with correct credentials", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  await resolveSignup({ name: "Grace Hopper", email: "grace@example.com", password: "compileristhebest", orgName: "Navy Org" });
  const login = await resolveLogin({ email: "grace@example.com", password: "compileristhebest" });

  assert.equal(login.ok, true);
});

test("resolveLogin rejects a wrong password without revealing whether the email exists", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  await resolveSignup({ name: "Grace Hopper", email: "grace2@example.com", password: "compileristhebest", orgName: "Navy Org" });
  const wrongPassword = await resolveLogin({ email: "grace2@example.com", password: "wrong-password" });
  const unknownEmail = await resolveLogin({ email: "nobody@example.com", password: "whatever123" });

  assert.equal(wrongPassword.ok, false);
  assert.equal(unknownEmail.ok, false);
  if (wrongPassword.ok || unknownEmail.ok) return;
  assert.equal(wrongPassword.error, unknownEmail.error, "error message must not leak which case it was");
});

test("resolveLogin locks out after 5 failed attempts (integration with loginThrottle)", async (t) => {
  const { cleanup } = useTempDb();
  t.after(cleanup);

  const email = `lockout-${Date.now()}@example.com`;
  await resolveSignup({ name: "Locked User", email, password: "correctpassword1", orgName: "Org" });

  for (let i = 0; i < 5; i++) {
    await resolveLogin({ email, password: "wrong" });
  }
  const attemptWithCorrectPassword = await resolveLogin({ email, password: "correctpassword1" });

  assert.equal(attemptWithCorrectPassword.ok, false);
  if (attemptWithCorrectPassword.ok) return;
  assert.match(attemptWithCorrectPassword.error, /too many failed attempts/i);
});
