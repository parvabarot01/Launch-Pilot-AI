import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { filterAuditLog } from "@/lib/exports";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/audit";
import { auditActionToken, riskSpineClass } from "@/lib/risk";
import { EmptyState } from "@/components/EmptyState";
import { StaggerRow } from "@/components/StaggerRows";
import type { AuditLogEntry } from "@/lib/types";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; entityType?: string };
}) {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const action = searchParams.action || undefined;
  const entityType = (searchParams.entityType || undefined) as AuditLogEntry["entityType"] | undefined;

  const db = await readDb();
  const allEntries = db.auditLog
    .filter((e) => e.orgId === ctx.org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const entries = filterAuditLog(allEntries, { action, entityType }).slice(0, 200);

  const exportHref = `/api/audit-log/export?${new URLSearchParams({
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  }).toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-ink">Audit log</h1>
          <p className="text-sm text-slate">
            Every governance-sensitive change, in order, for this organization — the compliance/change-log record.
          </p>
        </div>
        <a href={exportHref} className="btn-secondary">
          Export CSV
        </a>
      </div>

      <form className="card flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label">Action</label>
          <select name="action" defaultValue={action ?? ""} className="input">
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Entity type</label>
          <select name="entityType" defaultValue={entityType ?? ""} className="input">
            <option value="">All entity types</option>
            {AUDIT_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filter
        </button>
        {(action || entityType) && (
          <a href="/dashboard/audit-log" className="text-sm text-slate hover:underline">
            Clear filters
          </a>
        )}
      </form>

      <div className="card overflow-x-auto overflow-y-hidden !p-0">
        {entries.length === 0 ? (
          <EmptyState title="No audit events match these filters." chrome="oversee" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-wash text-eyebrow uppercase text-mute">
              <tr>
                <th className="px-6 py-3 font-semibold">When</th>
                <th className="px-6 py-3 font-semibold">Actor</th>
                <th className="px-6 py-3 font-semibold">Action</th>
                <th className="px-6 py-3 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {entries.map((e, i) => {
                const token = auditActionToken(e.action);
                return (
                  <StaggerRow as="tr" key={e.id} index={i} className="h-11 transition-colors duration-150 hover:bg-wash">
                    <td className={`whitespace-nowrap px-6 py-3 font-mono text-data text-slate ${token ? riskSpineClass(token) : ""}`}>
                      {new Date(e.createdAt).toLocaleString("en-US")}
                    </td>
                    <td className="px-6 py-3">{e.actorName}</td>
                    <td className="px-6 py-3 font-medium text-ink">{e.action}</td>
                    <td className="px-6 py-3 text-slate">
                      {e.entityType} · {e.entityId}
                    </td>
                  </StaggerRow>
                );
              })}
            </tbody>
          </table>
        )}
        {entries.length === 200 && (
          <p className="p-4 text-xs text-mute">
            Showing the most recent 200 matching entries. Use Export CSV for the full record.
          </p>
        )}
      </div>
    </div>
  );
}
