import type { AuditLogEntry } from "./types";

const AUDIT_LOG_CSV_HEADERS = ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Before", "After"];

function csvField(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  // Neutralize CSV/formula injection: actor names, flag names/descriptions,
  // and targeting rule values are all user-controlled and end up in this
  // export. A value like `=cmd|'/c calc'!A1` would execute as a formula if
  // a reviewer opens the report in Excel/Sheets — prefixing a leading
  // =, +, -, @, tab, or CR with a single quote forces it to be read as text.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // RFC 4180: quote any field containing a comma, quote, or newline, and
  // escape embedded quotes by doubling them.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Renders audit log entries as a CSV compliance/change-log report.
 * `before`/`after` are serialized as compact JSON so reviewers can see the
 * exact state transition without opening the app.
 */
export function auditLogToCsv(entries: AuditLogEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.createdAt,
      e.actorName,
      e.action,
      e.entityType,
      e.entityId,
      JSON.stringify(e.before ?? null),
      JSON.stringify(e.after ?? null),
    ]
      .map(csvField)
      .join(",")
  );
  return [AUDIT_LOG_CSV_HEADERS.join(","), ...rows].join("\r\n");
}

export interface AuditLogFilter {
  action?: string;
  entityType?: AuditLogEntry["entityType"];
}

export function filterAuditLog(entries: AuditLogEntry[], filter: AuditLogFilter): AuditLogEntry[] {
  return entries.filter((e) => {
    if (filter.action && e.action !== filter.action) return false;
    if (filter.entityType && e.entityType !== filter.entityType) return false;
    return true;
  });
}
