import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { filterAuditLog } from "@/lib/exports";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/audit";
import type { AuditLogEntry } from "@/lib/types";

export default function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; entityType?: string };
}) {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  const action = searchParams.action || undefined;
  const entityType = (searchParams.entityType || undefined) as AuditLogEntry["entityType"] | undefined;

  const db = readDb();
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
          <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
          <p className="text-sm text-slate-500">
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
          <a href="/dashboard/audit-log" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </a>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3">When</th>
              <th className="pb-3">Actor</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-3 whitespace-nowrap text-slate-500">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="py-3">{e.actorName}</td>
                <td className="py-3 font-medium text-slate-900">{e.action}</td>
                <td className="py-3 text-slate-500">
                  {e.entityType} · {e.entityId}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No audit events match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {entries.length === 200 && (
          <p className="mt-3 text-xs text-slate-400">
            Showing the most recent 200 matching entries. Use Export CSV for the full record.
          </p>
        )}
      </div>
    </div>
  );
}
