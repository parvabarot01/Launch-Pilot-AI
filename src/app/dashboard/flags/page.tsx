import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { CreateFlagForm } from "@/components/CreateFlagForm";
import { RiskDots } from "@/components/RiskSpine";
import { riskSpineClass, type RiskToken } from "@/lib/risk";
import { StaggerRow } from "@/components/StaggerRows";
import { HowItWorksFlow } from "@/components/HowItWorksFlow";

function flagRiskToken(state: { killSwitch: boolean; enabled: boolean } | undefined): RiskToken {
  if (!state) return "inert";
  if (state.killSwitch) return "halt";
  if (state.enabled) return "clear";
  return "inert";
}

export default async function FlagsPage() {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const flags = db.flags
    .filter((f) => f.orgId === ctx.org.id && !f.archivedAt)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-ink">Feature flags</h1>
          <p className="text-sm text-slate">
            Environment: <span className="font-medium capitalize">{ctx.environment.name}</span>
          </p>
        </div>
        <CreateFlagForm />
      </div>

      {flags.length === 0 ? (
        <div className="card">
          <p className="mb-6 text-sm text-mute">No flags in {ctx.environment.name} yet — here's how a flag moves through LaunchPilot.</p>
          <HowItWorksFlow orientation="vertical" compact defineAction={<CreateFlagForm />} />
        </div>
      ) : (
        <div className="card overflow-x-auto overflow-y-hidden !p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-wash text-eyebrow uppercase text-mute">
              <tr>
                <th className="px-6 py-3 font-semibold">Flag</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Rollout</th>
                <th className="px-6 py-3 font-semibold">Rules</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {flags.map((flag, i) => {
                const state = flag.environments.find((e) => e.environmentId === ctx.environment.id);
                const token = flagRiskToken(state);
                return (
                  <StaggerRow as="tr" key={flag.id} index={i} className="h-11 transition-colors duration-150 hover:bg-wash">
                    <td className={`px-6 py-3 ${riskSpineClass(token)}`}>
                      <div className="font-medium text-ink">{flag.name}</div>
                      <div className="text-xs text-mute">{flag.key}</div>
                    </td>
                    <td className="px-6 py-3">
                      <RiskDots token={token} />
                    </td>
                    <td className="px-6 py-3 font-mono text-data">{state?.rolloutPercentage ?? 0}%</td>
                    <td className="px-6 py-3 font-mono text-data">{state?.targetingRules.length ?? 0}</td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/dashboard/flags/${flag.id}`} className="text-brand hover:underline">
                        Manage
                      </Link>
                    </td>
                  </StaggerRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
