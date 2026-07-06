import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";

export default function AuditLogPage() {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  const db = readDb();
  const entries = db.auditLog
    .filter((e) => e.orgId === ctx.org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">Every governance-sensitive change, in order, for this organization.</p>
      </div>

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
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
