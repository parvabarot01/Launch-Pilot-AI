import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { CreateExperimentForm } from "@/components/CreateExperimentForm";
import { EmptyState } from "@/components/EmptyState";
import { IDENTITY_BG, getIdentityToken } from "@/lib/identity-color";

export default async function ExperimentsPage() {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const experiments = db.experiments
    .filter((e) => e.orgId === ctx.org.id && e.environmentId === ctx.environment.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const flags = db.flags.filter((f) => f.orgId === ctx.org.id && !f.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-ink">Experiments</h1>
          <p className="text-sm text-slate">
            Environment: <span className="font-medium capitalize">{ctx.environment.name}</span>
          </p>
        </div>
        <CreateExperimentForm environmentId={ctx.environment.id} flags={flags} />
      </div>

      {experiments.length === 0 ? (
        <div className="card">
          <EmptyState title="No experiments in this environment yet." chrome="ship" />
        </div>
      ) : (
        <div className="grid gap-4">
          {experiments.map((exp, i) => (
            <Link
              key={exp.id}
              href={`/dashboard/experiments/${exp.id}`}
              className="card block animate-fade-in-up hover:border-brand-300"
              style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-ink">
                  <span className={`h-2 w-2 rounded-full ${IDENTITY_BG[getIdentityToken(exp.id)]}`} aria-hidden="true" />
                  {exp.name}
                </h3>
                <span className="badge">{exp.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate">{exp.hypothesis}</p>
              <p className="mt-2 text-xs text-mute">
                {exp.variants.length} variants · success metric: {exp.successMetric}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
