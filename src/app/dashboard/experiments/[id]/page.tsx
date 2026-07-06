import { notFound, redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { analyzeExperiment } from "@/lib/ai";
import { ExperimentControls } from "@/components/ExperimentControls";

const VERDICT_COPY: Record<string, { label: string; style: string }> = {
  ship_winner: { label: "Ship the winner", style: "bg-green-50 text-green-700" },
  no_effect: { label: "No significant effect", style: "bg-slate-100 text-slate-600" },
  insufficient_data: { label: "Needs more data", style: "bg-amber-50 text-amber-700" },
  keep_running: { label: "Keep running", style: "bg-blue-50 text-blue-700" },
};

export default function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  const db = readDb();
  const experiment = db.experiments.find((e) => e.id === params.id && e.orgId === ctx.org.id);
  if (!experiment) notFound();

  const events = db.events.filter((e) => e.experimentId === experiment.id);
  const analysis = analyzeExperiment(experiment, events);
  const verdict = VERDICT_COPY[analysis.verdict];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{experiment.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{experiment.hypothesis}</p>
          <p className="mt-2 text-xs text-slate-400">Success metric: {experiment.successMetric}</p>
        </div>
        <span className={`badge ${verdict.style}`}>{verdict.label}</span>
      </div>

      <ExperimentControls experimentId={experiment.id} status={experiment.status} />

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3">Variant</th>
              <th className="pb-3">Exposures</th>
              <th className="pb-3">Conversion rate</th>
              <th className="pb-3">95% CI</th>
              <th className="pb-3">Lift vs control</th>
              <th className="pb-3">p-value</th>
              <th className="pb-3">Sample size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analysis.results.map((r, i) => {
              const exposures = events.filter(
                (e) => e.variantId === r.variantId && e.eventType === "exposure"
              ).length;
              return (
                <tr key={r.variantId}>
                  <td className="py-3 font-medium text-slate-900">
                    {r.variantName}
                    {experiment.variants[i]?.isControl && (
                      <span className="ml-2 badge bg-slate-100 text-slate-500">control</span>
                    )}
                  </td>
                  <td className="py-3">{exposures.toLocaleString()}</td>
                  <td className="py-3">{(r.conversionRate * 100).toFixed(2)}%</td>
                  <td className="py-3">
                    {r.confidenceIntervalLow !== null
                      ? `${(r.confidenceIntervalLow * 100).toFixed(1)}%–${(r.confidenceIntervalHigh! * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="py-3">
                    {r.liftVsControl !== null ? (
                      <span className={r.liftVsControl >= 0 ? "text-green-700" : "text-red-700"}>
                        {r.liftVsControl >= 0 ? "+" : ""}
                        {(r.liftVsControl * 100).toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3">
                    {r.pValue !== null ? (
                      <span className={r.isSignificant ? "font-semibold text-green-700" : ""}>
                        {r.pValue.toFixed(4)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3">
                    {r.sampleSizeAdequate ? (
                      <span className="text-green-700">Adequate</span>
                    ) : (
                      <span className="text-amber-700">Need {r.requiredSampleSizePerVariant.toLocaleString()}/variant</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-900">What this means</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
          {analysis.winner
            ? `${analysis.winner.variantName} is beating control by ${(analysis.winner.liftVsControl! * 100).toFixed(1)}% with a p-value of ${analysis.winner.pValue?.toFixed(4)} — statistically significant at the 95% confidence level.`
            : "No variant has a statistically significant lift over control yet."}
        </p>
        <a href="/dashboard/assistant" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Ask the AI assistant about this experiment →
        </a>
      </div>
    </div>
  );
}
