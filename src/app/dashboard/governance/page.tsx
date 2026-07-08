import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext, requireRole } from "@/lib/context";
import { ApprovalActions } from "@/components/ApprovalActions";
import { toRiskLevel } from "@/lib/governance";
import { riskSpineClass, toRegisterToken, RISK_TEXT } from "@/lib/risk";
import { RiskDots } from "@/components/RiskSpine";
import { StaggerRow } from "@/components/StaggerRows";

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
        <h1 className="text-page-title text-ink">Release governance</h1>
        <p className="text-sm text-slate">
          Rollout increases of 50+ points, or reaching 100%, require admin/owner sign-off.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-section-head text-ink">Pending approvals</h2>
        {pending.length === 0 && <p className="text-sm text-mute">Nothing waiting on review.</p>}
        {pending.map((a) => {
          const token = toRegisterToken(toRiskLevel(a.riskScore));
          return (
            <div key={a.id} className={`card flex items-start justify-between ${riskSpineClass(token)}`}>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-ink">{flagName(a.flagId)}</h3>
                  <RiskDots token={token} score={a.riskScore} />
                </div>
                <p className="mt-1 text-sm text-slate">
                  {a.fromRolloutPercentage}% → {a.toRolloutPercentage}% · requested by {a.requestedByName}
                </p>
                {a.riskFactors.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-mute">
                    {a.riskFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
              {canDecide ? (
                <ApprovalActions approvalId={a.id} />
              ) : (
                <span className="text-xs text-mute">Awaiting admin/owner</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-section-head text-ink">Recent decisions</h2>
        {decided.length === 0 && <p className="text-sm text-mute">No decisions yet.</p>}
        {decided.length > 0 && (
          <div className="card overflow-x-auto overflow-y-hidden !p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-wash text-eyebrow uppercase text-mute">
                <tr>
                  <th className="px-6 py-3 font-semibold">Flag</th>
                  <th className="px-6 py-3 font-semibold">Change</th>
                  <th className="px-6 py-3 font-semibold">Risk</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Reviewed by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {decided.map((a, i) => {
                  const token = toRegisterToken(toRiskLevel(a.riskScore));
                  return (
                    <StaggerRow as="tr" key={a.id} index={i} className="h-11 transition-colors duration-150 hover:bg-wash">
                      <td className={`px-6 py-3 font-medium text-ink ${riskSpineClass(token)}`}>{flagName(a.flagId)}</td>
                      <td className="px-6 py-3 font-mono text-data">
                        {a.fromRolloutPercentage}% → {a.toRolloutPercentage}%
                      </td>
                      <td className="px-6 py-3">
                        <RiskDots token={token} score={a.riskScore} />
                      </td>
                      <td className="px-6 py-3">
                        <span className={a.status === "approved" ? RISK_TEXT.clear : RISK_TEXT.halt}>{a.status}</span>
                      </td>
                      <td className="px-6 py-3 text-slate">{a.reviewedByName}</td>
                    </StaggerRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
