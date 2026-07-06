import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { computeRiskScore } from "@/lib/governance";
import { analyzeExperiment } from "@/lib/ai";

export default function ExecutiveDashboardPage() {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  const db = readDb();
  const flags = db.flags.filter((f) => f.orgId === ctx.org.id && !f.archivedAt);
  const experiments = db.experiments.filter(
    (e) => e.orgId === ctx.org.id && e.environmentId === ctx.environment.id
  );
  const runningExperiments = experiments.filter((e) => e.status === "running");
  const pendingApprovals = db.approvals.filter(
    (a) => a.orgId === ctx.org.id && a.status === "pending"
  );

  const releaseCalendar = flags
    .map((flag) => {
      const state = flag.environments.find((e) => e.environmentId === ctx.environment.id);
      if (!state) return null;
      const risk = computeRiskScore({
        fromPercentage: 0,
        toPercentage: state.rolloutPercentage,
        environmentKey: ctx.environment.key,
        hasActiveExperimentAttached: experiments.some((e) => e.flagId === flag.id && e.status === "running"),
        recentRollbackCount: db.rollbackSnapshots.filter(
          (s) => s.flagId === flag.id && s.environmentId === ctx.environment.id
        ).length,
      });
      return { flag, state, risk };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.state.rolloutPercentage > 0)
    .sort((a, b) => b.risk.score - a.risk.score);

  const winners = experiments
    .map((e) => analyzeExperiment(e, db.events.filter((ev) => ev.experimentId === e.id)))
    .filter((a) => a.verdict === "ship_winner");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Executive summary</h1>
        <p className="text-sm text-slate-500">
          {ctx.org.name} · <span className="capitalize">{ctx.environment.name}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Active flags" value={flags.length} />
        <StatCard label="Running experiments" value={runningExperiments.length} />
        <StatCard label="Pending approvals" value={pendingApprovals.length} accent={pendingApprovals.length > 0} />
        <StatCard label="Ready-to-ship winners" value={winners.length} accent={winners.length > 0} good />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Risk-scored release calendar</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Flag</th>
                <th className="pb-3">Rollout</th>
                <th className="pb-3">Risk score</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releaseCalendar.map(({ flag, state, risk }) => (
                <tr key={flag.id}>
                  <td className="py-3 font-medium text-slate-900">{flag.name}</td>
                  <td className="py-3">{state.rolloutPercentage}%</td>
                  <td className="py-3">{risk.score}/100 ({risk.level})</td>
                  <td className="py-3 text-right">
                    <Link href={`/dashboard/flags/${flag.id}`} className="text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {releaseCalendar.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No active rollouts in this environment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {winners.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Ready to ship</h2>
          <div className="grid gap-3">
            {winners.map((w) => (
              <Link key={w.experiment.id} href={`/dashboard/experiments/${w.experiment.id}`} className="card block hover:border-brand-300">
                <span className="font-medium text-slate-900">{w.experiment.name}</span>
                <span className="ml-2 text-sm text-green-700">
                  {w.winner?.variantName} +{((w.winner?.liftVsControl ?? 0) * 100).toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, good }: { label: string; value: number; accent?: boolean; good?: boolean }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ? (good ? "text-green-600" : "text-amber-600") : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
