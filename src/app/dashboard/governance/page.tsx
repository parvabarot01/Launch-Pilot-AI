import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext, requireRole } from "@/lib/context";
import { ApprovalActions } from "@/components/ApprovalActions";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

function riskLevel(score: number) {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export default async function GovernancePage() {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const canDecide = requireRole(ctx, "admin");

  const approvals = db.approvals
    .filter((a) => a.orgId === ctx.org.id && a.environmentId === ctx.environment.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending").slice(0, 20);

  function flagName(flagId: string) {
    return db.flags.find((f) => f.id === flagId)?.name ?? "Unknown flag";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Release governance</h1>
        <p className="text-sm text-slate-500">
          Rollout increases of 50+ points, or reaching 100%, require admin/owner sign-off.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Pending approvals</h2>
        {pending.length === 0 && <p className="text-sm text-slate-400">Nothing waiting on review.</p>}
        {pending.map((a) => {
          const level = riskLevel(a.riskScore);
          return (
            <div key={a.id} className="card flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{flagName(a.flagId)}</h3>
                  <span className={`badge ${RISK_STYLES[level]}`}>risk: {a.riskScore}/100 ({level})</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {a.fromRolloutPercentage}% → {a.toRolloutPercentage}% · requested by {a.requestedByName}
                </p>
                {a.riskFactors.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
                    {a.riskFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
              {canDecide ? (
                <ApprovalActions approvalId={a.id} />
              ) : (
                <span className="text-xs text-slate-400">Awaiting admin/owner</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent decisions</h2>
        {decided.length === 0 && <p className="text-sm text-slate-400">No decisions yet.</p>}
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Flag</th>
                <th className="pb-3">Change</th>
                <th className="pb-3">Risk</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Reviewed by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {decided.map((a) => (
                <tr key={a.id}>
                  <td className="py-3">{flagName(a.flagId)}</td>
                  <td className="py-3">
                    {a.fromRolloutPercentage}% → {a.toRolloutPercentage}%
                  </td>
                  <td className="py-3">{a.riskScore}/100</td>
                  <td className="py-3">
                    <span className={a.status === "approved" ? "text-green-700" : "text-red-700"}>{a.status}</span>
                  </td>
                  <td className="py-3">{a.reviewedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
