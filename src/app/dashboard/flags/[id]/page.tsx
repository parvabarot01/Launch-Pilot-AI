import { notFound, redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { FlagStateEditor } from "@/components/FlagStateEditor";
import { RollbackList } from "@/components/RollbackList";
import { ArchiveFlagButton } from "@/components/ArchiveFlagButton";
import { riskSpineClass } from "@/lib/risk";

export default async function FlagDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const flag = db.flags.find((f) => f.id === params.id && f.orgId === ctx.org.id);
  if (!flag) notFound();

  const state = flag.environments.find((e) => e.environmentId === ctx.environment.id);
  if (!state) notFound();

  const snapshots = db.rollbackSnapshots.filter(
    (s) => s.flagId === flag.id && s.environmentId === ctx.environment.id
  );

  const pendingApprovals = db.approvals.filter(
    (a) => a.flagId === flag.id && a.environmentId === ctx.environment.id && a.status === "pending"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-ink">{flag.name}</h1>
          <p className="text-sm text-mute">
            {flag.key} · environment: <span className="font-medium capitalize">{ctx.environment.name}</span>
          </p>
          {flag.description && <p className="mt-2 max-w-2xl text-sm text-slate">{flag.description}</p>}
        </div>
        <ArchiveFlagButton flagId={flag.id} />
      </div>

      {pendingApprovals.length > 0 && (
        <div className={`card bg-risk-watch-wash ${riskSpineClass("watch")}`}>
          <p className="text-sm font-medium text-risk-watch">
            {pendingApprovals.length} pending rollout approval request(s) for this environment.{" "}
            <a href="/dashboard/governance" className="underline">
              Review in Governance
            </a>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FlagStateEditor
            flagId={flag.id}
            environmentId={ctx.environment.id}
            initialEnabled={state.enabled}
            initialKillSwitch={state.killSwitch}
            initialRollout={state.rolloutPercentage}
            initialRules={state.targetingRules}
          />
        </div>
        <div className="card h-fit">
          <h3 className="font-semibold text-ink">Rollback history</h3>
          <p className="mb-4 text-sm text-slate">Auto-snapshotted before every change.</p>
          <RollbackList snapshots={snapshots} />
        </div>
      </div>
    </div>
  );
}
