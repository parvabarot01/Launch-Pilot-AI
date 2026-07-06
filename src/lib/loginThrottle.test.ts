import { test } from "node:test";
import assert from "node:assert/strict";
import { isLockedOut, recordFailedLogin, clearFailedLogins } from "./loginThrottle";

function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("a fresh email is never locked out", () => {
  assert.equal(isLockedOut(uniqueEmail()).locked, false);
});

test("fewer than the max failed attempts does not lock out", () => {
  const email = uniqueEmail();
  for (let i = 0; i < 4; i++) recordFailedLogin(email);
  assert.equal(isLockedOut(email).locked, false);
});

test("reaching the max failed attempts locks out with a positive retry time", () => {
  const email = uniqueEmail();
  for (let i = 0; i < 5; i++) recordFailedLogin(email);
  const result = isLockedOut(email);
  assert.equal(result.locked, true);
  assert.ok(result.retryAfterSeconds > 0);
});

test("clearFailedLogins resets the lockout (e.g. after a successful login)", () => {
  const email = uniqueEmail();
  for (let i = 0; i < 5; i++) recordFailedLogin(email);
  assert.equal(isLockedOut(email).locked, true);
  clearFailedLogins(email);
  assert.equal(isLockedOut(email).locked, false);
});

test("lockout tracking is case-insensitive and trims whitespace on the email", () => {
  const email = uniqueEmail();
  for (let i = 0; i < 5; i++) recordFailedLogin(email.toUpperCase());
  assert.equal(isLockedOut(`  ${email}  `).locked, true);
});

test("emails are tracked independently of each other", () => {
  const emailA = uniqueEmail();
  const emailB = uniqueEmail();
  for (let i = 0; i < 5; i++) recordFailedLogin(emailA);
  assert.equal(isLockedOut(emailA).locked, true);
  assert.equal(isLockedOut(emailB).locked, false);
});
