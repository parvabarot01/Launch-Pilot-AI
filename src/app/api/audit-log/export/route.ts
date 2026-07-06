import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { auditLogToCsv, filterAuditLog } from "@/lib/exports";
import type { AuditLogEntry } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Compliance/change-log export — a CSV of every audited change for the
 * viewer's active org, optionally filtered by action or entity type.
 * Session-authenticated (not API-key), same access level as the Audit Log
 * page itself.
 */
export async function GET(request: NextRequest) {
  const ctx = requireViewerContext();
  if (!ctx) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") || undefined;
  const entityType = (request.nextUrl.searchParams.get("entityType") || undefined) as
    | AuditLogEntry["entityType"]
    | undefined;

  const db = readDb();
  const entries = filterAuditLog(
    db.auditLog
      .filter((e) => e.orgId === ctx.org.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    { action, entityType }
  );

  const csv = auditLogToCsv(entries);
  const filename = `launchpilot-audit-log-${ctx.org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
