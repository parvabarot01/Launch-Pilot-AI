import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { CreateFlagForm } from "@/components/CreateFlagForm";

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
          <h1 className="text-2xl font-bold text-slate-900">Feature flags</h1>
          <p className="text-sm text-slate-500">
            Environment: <span className="font-medium capitalize">{ctx.environment.name}</span>
          </p>
        </div>
        <CreateFlagForm />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3">Flag</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Rollout</th>
              <th className="pb-3">Rules</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flags.map((flag) => {
              const state = flag.environments.find((e) => e.environmentId === ctx.environment.id);
              return (
                <tr key={flag.id}>
                  <td className="py-3">
                    <div className="font-medium text-slate-900">{flag.name}</div>
                    <div className="text-xs text-slate-400">{flag.key}</div>
                  </td>
                  <td className="py-3">
                    {state?.killSwitch ? (
                      <span className="badge bg-red-50 text-red-700">Kill switch on</span>
                    ) : state?.enabled ? (
                      <span className="badge bg-green-50 text-green-700">Enabled</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600">Disabled</span>
                    )}
                  </td>
                  <td className="py-3">{state?.rolloutPercentage ?? 0}%</td>
                  <td className="py-3">{state?.targetingRules.length ?? 0}</td>
                  <td className="py-3 text-right">
                    <Link href={`/dashboard/flags/${flag.id}`} className="text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {flags.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No flags yet. Create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
