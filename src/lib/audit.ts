import type { Database, AuditAction, AuditLogEntry } from "./types";
import { newId } from "./ids";

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
