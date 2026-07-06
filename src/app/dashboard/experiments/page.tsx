import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { CreateExperimentForm } from "@/components/CreateExperimentForm";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  running: "bg-green-50 text-green-700",
  completed: "bg-blue-50 text-blue-700",
  archived: "bg-slate-100 text-slate-400",
};

export default function ExperimentsPage() {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  const db = readDb();
  const experiments = db.experiments
    .filter((e) => e.orgId === ctx.org.id && e.environmentId === ctx.environment.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const flags = db.flags.filter((f) => f.orgId === ctx.org.id && !f.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-sm text-slate-500">
            Environment: <span className="font-medium capitalize">{ctx.environment.name}</span>
          </p>
        </div>
        <CreateExperimentForm environmentId={ctx.environment.id} flags={flags} />
      </div>

      <div className="grid gap-4">
        {experiments.map((exp) => (
          <Link key={exp.id} href={`/dashboard/experiments/${exp.id}`} className="card block hover:border-brand-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{exp.name}</h3>
              <span className={`badge ${STATUS_STYLES[exp.status]}`}>{exp.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{exp.hypothesis}</p>
            <p className="mt-2 text-xs text-slate-400">
              {exp.variants.length} variants · success metric: {exp.successMetric}
            </p>
          </Link>
        ))}
        {experiments.length === 0 && (
          <div className="card text-center text-slate-400">No experiments yet in this environment.</div>
        )}
      </div>
    </div>
  );
}
