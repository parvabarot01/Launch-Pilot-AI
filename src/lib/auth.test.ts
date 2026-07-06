import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, roleAtLeast } from "./auth";

test("hashPassword produces a verifiable hash with a random salt", () => {
  const { hash, salt } = hashPassword("correct horse battery staple");
  assert.ok(hash.length > 0);
  assert.ok(salt.length > 0);
  assert.equal(verifyPassword("correct horse battery staple", hash, salt), true);
});

test("verifyPassword rejects the wrong password", () => {
  const { hash, salt } = hashPassword("correct horse battery staple");
  assert.equal(verifyPassword("wrong password", hash, salt), false);
});

test("two hashes of the same password use different salts and differ", () => {
  const a = hashPassword("same-password");
  const b = hashPassword("same-password");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test("a valid session token round-trips to the original user id", () => {
  const token = createSessionToken("user_123");
  const payload = verifySessionToken(token);
  assert.ok(payload);
  assert.equal(payload!.userId, "user_123");
});

test("an undefined token verifies to null", () => {
  assert.equal(verifySessionToken(undefined), null);
});

test("a malformed token verifies to null", () => {
  assert.equal(verifySessionToken("not-a-real-token"), null);
  assert.equal(verifySessionToken(""), null);
});

test("a tampered payload fails signature verification", () => {
  const token = createSessionToken("user_123");
  const [body, signature] = token.split(".");
  const tamperedBody = Buffer.from(JSON.stringify({ userId: "user_attacker", exp: Date.now() + 100000 })).toString(
    "base64url"
  );
  const tampered = `${tamperedBody}.${signature}`;
  assert.equal(verifySessionToken(tampered), null);
});

test("an expired token fails verification", () => {
  // Construct a token with an already-past expiry using the same signing
  // scheme createSessionToken uses, to verify the expiry check actually runs.
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-in-production";
  const payload = { userId: "user_123", exp: Date.now() - 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const expiredToken = `${body}.${signature}`;
  assert.equal(verifySessionToken(expiredToken), null);
});

test("roleAtLeast reflects the owner > admin > member > viewer hierarchy", () => {
  assert.equal(roleAtLeast("owner", "admin"), true);
  assert.equal(roleAtLeast("admin", "owner"), false);
  assert.equal(roleAtLeast("member", "member"), true);
  assert.equal(roleAtLeast("viewer", "member"), false);
  assert.equal(roleAtLeast("owner", "viewer"), true);
});
