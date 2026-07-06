import type { Database, AuditAction, AuditLogEntry } from "./types";
import { newId } from "./ids";

export const AUDIT_ACTIONS: AuditAction[] = [
  "flag.created",
  "flag.updated",
  "flag.archived",
  "flag.rollout_changed",
  "flag.kill_switch_toggled",
  "flag.targeting_updated",
  "experiment.created",
  "experiment.status_changed",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "rollback.performed",
  "org.member_added",
  "org.member_role_changed",
];

export const AUDIT_ENTITY_TYPES: AuditLogEntry["entityType"][] = [
  "flag",
  "experiment",
  "approval",
  "organization",
];

export function appendAudit(
  db: Database,
  entry: {
    orgId: string;
    actorId: string;
    actorName: string;
    action: AuditAction;
    entityType: AuditLogEntry["entityType"];
    entityId: string;
    before: unknown;
    after: unknown;
  }
): AuditLogEntry {
  const record: AuditLogEntry = {
    id: newId("audit"),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  db.auditLog.push(record);
  return record;
}
