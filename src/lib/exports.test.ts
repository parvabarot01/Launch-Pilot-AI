import { test } from "node:test";
import assert from "node:assert/strict";
import { auditLogToCsv, filterAuditLog } from "./exports";
import type { AuditLogEntry } from "./types";

function entry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: "audit_1",
    orgId: "org_1",
    actorId: "user_1",
    actorName: "Ada Lovelace",
    action: "flag.rollout_changed",
    entityType: "flag",
    entityId: "flag_1",
    before: { rolloutPercentage: 10 },
    after: { rolloutPercentage: 50 },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("CSV output has a header row plus one row per entry", () => {
  const csv = auditLogToCsv([entry(), entry({ id: "audit_2" })]);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "Timestamp,Actor,Action,Entity Type,Entity ID,Before,After");
});

test("fields containing commas or quotes are CSV-escaped", () => {
  const csv = auditLogToCsv([entry({ actorName: 'Ada "The Enchantress" Lovelace, Countess' })]);
  const dataLine = csv.split("\r\n")[1];
  assert.match(dataLine, /"Ada ""The Enchantress"" Lovelace, Countess"/);
});

test("before/after are serialized as JSON so state transitions are inspectable", () => {
  const csv = auditLogToCsv([entry({ before: null, after: { killSwitch: true } })]);
  assert.match(csv, /"\{""killSwitch"":true\}"/);
});

test("empty entry list still produces a header-only CSV", () => {
  const csv = auditLogToCsv([]);
  assert.equal(csv, "Timestamp,Actor,Action,Entity Type,Entity ID,Before,After");
});

test("filterAuditLog narrows by action and entity type independently", () => {
  const entries = [
    entry({ id: "a", action: "flag.rollout_changed", entityType: "flag" }),
    entry({ id: "b", action: "approval.approved", entityType: "approval" }),
    entry({ id: "c", action: "flag.kill_switch_toggled", entityType: "flag" }),
  ];

  assert.deepEqual(
    filterAuditLog(entries, { entityType: "flag" }).map((e) => e.id),
    ["a", "c"]
  );
  assert.deepEqual(
    filterAuditLog(entries, { action: "approval.approved" }).map((e) => e.id),
    ["b"]
  );
  assert.deepEqual(filterAuditLog(entries, {}).map((e) => e.id), ["a", "b", "c"]);
});
