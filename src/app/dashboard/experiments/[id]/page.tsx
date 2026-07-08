import { notFound, redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { analyzeExperiment, type ExperimentAnalysis } from "@/lib/ai";
import { ExperimentControls } from "@/components/ExperimentControls";
import { riskSpineClass, verdictToken, RISK_TEXT, type RiskToken } from "@/lib/risk";
import { RiskDots } from "@/components/RiskSpine";
import { IDENTITY_BG, IDENTITY_BG_WASH, getIdentityToken, getVariantBg } from "@/lib/identity-color";

const VERDICT_LABEL: Record<ExperimentAnalysis["verdict"], string> = {
  ship_winner: "Ship the winner",
  no_effect: "No significant effect",
  insufficient_data: "Needs more data",
  keep_running: "Keep running",
};

function resultRowToken(r: ExperimentAnalysis["results"][number]): RiskToken {
  if (r.pValue === null || r.liftVsControl === null) return "inert";
  if (r.isSignificant && r.liftVsControl > 0) return "clear";
  if (r.isSignificant && r.liftVsControl <= 0) return "halt";
  return "watch";
}

export default async function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const experiment = db.experiments.find((e) => e.id === params.id && e.orgId === ctx.org.id);
  if (!experiment) notFound();

  const events = db.events.filter((e) => e.experimentId === experiment.id);
  const analysis = analyzeExperiment(experiment, events);
  const token = verdictToken(analysis.verdict, experiment.status);
  const identityToken = getIdentityToken(experiment.id);
  const maxConversion = Math.max(...analysis.results.map((r) => r.conversionRate), 0.0001);

  return (
    <div className="space-y-6">
      <div className={`h-1 w-full rounded-full ${IDENTITY_BG[identityToken]}`} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-ink">{experiment.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate">{experiment.hypothesis}</p>
          <p className="mt-2 text-xs text-mute">Success metric: {experiment.successMetric}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskDots token={token} />
          <span className={`text-sm font-medium ${RISK_TEXT[token]}`}>{VERDICT_LABEL[analysis.verdict]}</span>
        </div>
      </div>

      <ExperimentControls experimentId={experiment.id} status={experiment.status} />

      <div className="card">
        <h3 className="text-section-head text-ink">Conversion rate by variant</h3>
        <div className="mt-4 space-y-3">
          {analysis.results.map((r, i) => {
            const barBg = getVariantBg(experiment.id, i);
            const pct = (r.conversionRate / maxConversion) * 100;
            const ciLowPct = r.confidenceIntervalLow !== null ? (r.confidenceIntervalLow / maxConversion) * 100 : null;
            const ciHighPct = r.confidenceIntervalHigh !== null ? (r.confidenceIntervalHigh / maxConversion) * 100 : null;
            return (
              <div key={r.variantId} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm text-slate">{r.variantName}</span>
                <div className="relative h-3 flex-1 rounded-full bg-wash">
                  {ciLowPct !== null && ciHighPct !== null && (
                    <div
                      className={`absolute inset-y-0 rounded-full ${IDENTITY_BG_WASH[identityToken]}`}
                      style={{ left: `${Math.min(ciLowPct, 100)}%`, width: `${Math.max(0, ciHighPct - ciLowPct)}%` }}
                    />
                  )}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${barBg}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-slate">
                  {(r.conversionRate * 100).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card overflow-x-auto overflow-y-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-wash text-eyebrow uppercase text-mute">
            <tr>
              <th className="px-6 py-3 font-semibold">Variant</th>
              <th className="px-6 py-3 font-semibold">Exposures</th>
              <th className="px-6 py-3 font-semibold">Conversion rate</th>
              <th className="px-6 py-3 font-semibold">95% CI</th>
              <th className="px-6 py-3 font-semibold">Lift vs control</th>
              <th className="px-6 py-3 font-semibold">p-value</th>
              <th className="px-6 py-3 font-semibold">Sample size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {analysis.results.map((r, i) => {
              const exposures = events.filter(
                (e) => e.variantId === r.variantId && e.eventType === "exposure"
              ).length;
              const rowToken = resultRowToken(r);
              return (
                <tr key={r.variantId} className="h-11 transition-colors duration-150 hover:bg-wash">
                  <td className={`px-6 py-3 font-medium text-ink ${riskSpineClass(rowToken)}`}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getVariantBg(experiment.id, i)}`} aria-hidden="true" />
                      {r.variantName}
                    </span>
                    {experiment.variants[i]?.isControl && <span className="ml-2 badge">control</span>}
                  </td>
                  <td className="px-6 py-3 font-mono text-data">{exposures.toLocaleString()}</td>
                  <td className="px-6 py-3 font-mono text-data">{(r.conversionRate * 100).toFixed(2)}%</td>
                  <td className="px-6 py-3 font-mono text-data">
                    {r.confidenceIntervalLow !== null
                      ? `${(r.confidenceIntervalLow * 100).toFixed(1)}%–${(r.confidenceIntervalHigh! * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-6 py-3 font-mono text-data">
                    {r.liftVsControl !== null ? (
                      <span className={r.liftVsControl >= 0 ? RISK_TEXT.clear : RISK_TEXT.halt}>
                        {r.liftVsControl >= 0 ? "+" : ""}
                        {(r.liftVsControl * 100).toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-data">
                    {r.pValue !== null ? (
                      <span className={r.isSignificant ? `font-semibold ${RISK_TEXT.clear}` : ""}>
                        {r.pValue.toFixed(4)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-data">
                    {r.sampleSizeAdequate ? (
                      <span className={RISK_TEXT.clear}>Adequate</span>
                    ) : (
                      <span className={RISK_TEXT.watch}>Need {r.requiredSampleSizePerVariant.toLocaleString()}/variant</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink">What this means</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-slate">
          {analysis.winner
            ? `${analysis.winner.variantName} is beating control by ${(analysis.winner.liftVsControl! * 100).toFixed(1)}% with a p-value of ${analysis.winner.pValue?.toFixed(4)} — statistically significant at the 95% confidence level.`
            : "No variant has a statistically significant lift over control yet."}
        </p>
      </div>
    </div>
  );
}
