import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { computeRiskScore, toRiskLevel } from "@/lib/governance";
import { analyzeExperiment } from "@/lib/ai";
import { riskSpineClass, toRegisterToken } from "@/lib/risk";
import { RiskDots } from "@/components/RiskSpine";
import { StatCard } from "@/components/StatCard";
import { StaggerRow } from "@/components/StaggerRows";
import { EmptyState } from "@/components/EmptyState";
import { dailyBuckets } from "@/lib/timeseries";
import { IDENTITY_BG, getIdentityToken } from "@/lib/identity-color";

export default async function ExecutiveDashboardPage() {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const flags = db.flags.filter((f) => f.orgId === ctx.org.id && !f.archivedAt);
  const experiments = db.experiments.filter(
    (e) => e.orgId === ctx.org.id && e.environmentId === ctx.environment.id
  );
  const runningExperiments = experiments.filter((e) => e.status === "running");
  const orgApprovals = db.approvals.filter((a) => a.orgId === ctx.org.id);
  const pendingApprovals = orgApprovals.filter((a) => a.status === "pending");

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
        <h1 className="text-page-title text-ink">Executive summary</h1>
        <p className="text-sm text-slate">
          {ctx.org.name} · <span className="capitalize">{ctx.environment.name}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Active flags"
          value={flags.length}
          href="/dashboard/flags"
          token="inert"
          sparkline={dailyBuckets(flags.map((f) => f.createdAt))}
        />
        <StatCard
          label="Running experiments"
          value={runningExperiments.length}
          href="/dashboard/experiments"
          token="inert"
          sparkline={dailyBuckets(runningExperiments.map((e) => e.createdAt))}
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals.length}
          href="/dashboard/governance"
          token={pendingApprovals.length > 0 ? "watch" : "inert"}
          sparkline={dailyBuckets(orgApprovals.map((a) => a.createdAt))}
          headline
        />
        <StatCard
          label="Ready-to-ship winners"
          value={winners.length}
          href="/dashboard/experiments"
          token={winners.length > 0 ? "clear" : "inert"}
        />
      </div>

      <div>
        <h2 className="mb-3 text-section-head text-ink">Risk-scored release calendar</h2>
        <div className="card overflow-x-auto overflow-y-hidden !p-0">
          {releaseCalendar.length === 0 ? (
            <EmptyState title="No active rollouts in this environment." chrome="oversee" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-wash text-eyebrow uppercase text-mute">
                <tr>
                  <th className="px-6 py-3 font-semibold">Flag</th>
                  <th className="px-6 py-3 font-semibold">Rollout</th>
                  <th className="px-6 py-3 font-semibold">Risk</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {releaseCalendar.map(({ flag, state, risk }, i) => {
                  const token = toRegisterToken(toRiskLevel(risk.score));
                  return (
                    <StaggerRow as="tr" key={flag.id} index={i} className="h-11 transition-colors duration-150 hover:bg-wash">
                      <td className={`px-6 py-3 font-medium text-ink ${riskSpineClass(token)}`}>{flag.name}</td>
                      <td className="px-6 py-3 font-mono text-data">{state.rolloutPercentage}%</td>
                      <td className="px-6 py-3">
                        <RiskDots token={token} score={risk.score} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/dashboard/flags/${flag.id}`} className="text-brand hover:underline">
                          View
                        </Link>
                      </td>
                    </StaggerRow>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {winners.length > 0 && (
        <div>
          <h2 className="mb-3 text-section-head text-ink">Ready to ship</h2>
          <div className="grid gap-3">
            {winners.map((w, i) => (
              <Link
                key={w.experiment.id}
                href={`/dashboard/experiments/${w.experiment.id}`}
                className={`card block animate-fade-in-up hover:border-brand-300 ${riskSpineClass("clear")}`}
                style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
              >
                <span className="inline-flex items-center gap-2 font-medium text-ink">
                  <span className={`h-2 w-2 rounded-full ${IDENTITY_BG[getIdentityToken(w.experiment.id)]}`} aria-hidden="true" />
                  {w.experiment.name}
                </span>
                <span className="ml-2 font-mono text-sm text-risk-clear">
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
