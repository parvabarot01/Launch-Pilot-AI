import type { Experiment, ExperimentEvent, FeatureFlag } from "./types";
import { computeSignificance, type SignificanceResult, type VariantSample } from "./stats";

export interface ExperimentAnalysis {
  experiment: Experiment;
  results: SignificanceResult[];
  winner: SignificanceResult | null;
  verdict: "ship_winner" | "keep_running" | "no_effect" | "insufficient_data";
}

export function analyzeExperiment(
  experiment: Experiment,
  events: ExperimentEvent[]
): ExperimentAnalysis {
  const samples: VariantSample[] = experiment.variants.map((v) => {
    const variantEvents = events.filter((e) => e.variantId === v.id);
    return {
      variantId: v.id,
      variantName: v.name,
      isControl: v.isControl,
      exposures: variantEvents.filter((e) => e.eventType === "exposure").length,
      conversions: variantEvents.filter((e) => e.eventType === "conversion").length,
    };
  });

  const results = computeSignificance(samples);
  const allAdequate = results.every((r) => r.sampleSizeAdequate);
  const significant = results.filter((r) => r.isSignificant && (r.liftVsControl ?? 0) > 0);
  const best = significant.sort((a, b) => (b.liftVsControl ?? 0) - (a.liftVsControl ?? 0))[0];

  let verdict: ExperimentAnalysis["verdict"];
  if (!allAdequate) {
    verdict = "insufficient_data";
  } else if (best) {
    verdict = "ship_winner";
  } else if (results.some((r) => r.pValue !== null)) {
    verdict = "no_effect";
  } else {
    verdict = "keep_running";
  }

  return { experiment, results, winner: best ?? null, verdict };
}

/**
 * Rule-based recommendation engine, grounded in real computed statistics.
 * This is the always-available fallback; `askAssistant` upgrades to a
 * Groq-backed narrative when GROQ_API_KEY is configured, using this same
 * analysis as its grounding context either way.
 */
function heuristicNarrative(analysis: ExperimentAnalysis): string {
  const { experiment, results, winner, verdict } = analysis;
  const control = results.find((r, i) => experiment.variants[i]?.isControl) ?? results[0];
  const lines: string[] = [];

  lines.push(`Experiment "${experiment.name}" — status: ${experiment.status}.`);

  for (const r of results) {
    const pct = (r.conversionRate * 100).toFixed(2);
    const ci =
      r.confidenceIntervalLow !== null && r.confidenceIntervalHigh !== null
        ? ` (95% CI ${(r.confidenceIntervalLow * 100).toFixed(1)}%–${(r.confidenceIntervalHigh * 100).toFixed(1)}%)`
        : "";
    const liftText =
      r.liftVsControl !== null
        ? `, ${r.liftVsControl >= 0 ? "+" : ""}${(r.liftVsControl * 100).toFixed(1)}% vs control`
        : "";
    const pText = r.pValue !== null ? `, p=${r.pValue.toFixed(4)}` : "";
    lines.push(`- ${r.variantName}: ${pct}% conversion${ci}${liftText}${pText}`);
  }

  switch (verdict) {
    case "insufficient_data":
      lines.push(
        `Sample size is not yet adequate to trust these numbers. Target is ~${results[0]?.requiredSampleSizePerVariant.toLocaleString()} exposures per variant at the observed baseline rate to reliably detect a 5-point shift; keep the experiment running.`
      );
      break;
    case "ship_winner":
      lines.push(
        `Recommendation: ship ${winner?.variantName}. Its lift over control is statistically significant (p<0.05) with adequate sample size — this is not noise.`
      );
      break;
    case "no_effect":
      lines.push(
        `Recommendation: no variant beat control by a statistically significant margin. Consider concluding the experiment as a null result rather than extending it further.`
      );
      break;
    case "keep_running":
      lines.push(`Not enough conversion events recorded yet to compute a verdict.`);
      break;
  }

  return lines.join("\n");
}

function heuristicRolloutAdvice(flag: FeatureFlag, environmentId: string): string {
  const state = flag.environments.find((e) => e.environmentId === environmentId);
  if (!state) return `No data for flag "${flag.name}" in this environment yet.`;
  if (state.killSwitch) {
    return `Flag "${flag.name}" has its kill switch engaged — it is fully off for all users regardless of rollout percentage. Disable the kill switch before considering any rollout change.`;
  }
  if (state.rolloutPercentage >= 100) {
    return `Flag "${flag.name}" is already at 100% rollout in this environment. Consider whether it's ready to be cleaned up (code that checks this flag can likely be removed).`;
  }
  const next = Math.min(100, state.rolloutPercentage + 25);
  return `Flag "${flag.name}" is at ${state.rolloutPercentage}% rollout with ${state.targetingRules.length} targeting rule(s) active. If error rates and key metrics have been stable, a typical safe next step is increasing to ${next}% and monitoring before continuing. Any increase above the org's governance threshold will require approval.`;
}

export interface AssistantContext {
  flags: FeatureFlag[];
  experimentAnalyses: ExperimentAnalysis[];
  environmentId: string;
}

async function callGroq(question: string, groundingText: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a release-governance and experimentation analyst for a feature-flag platform. Answer using ONLY the grounding data provided. Be concise, cite actual numbers, and give a clear recommendation. Never invent data that isn't in the context.",
          },
          { role: "user", content: `Context:\n${groundingText}\n\nQuestion: ${question}` },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Answers a free-text question about the org's flags/experiments.
 * Swap point: set GROQ_API_KEY to route this through Groq's Llama 3.3 70B
 * with the same grounding context; unset, it uses the local heuristic
 * engine below (always available, zero external calls).
 */
export async function askAssistant(question: string, context: AssistantContext): Promise<{
  answer: string;
  source: "groq" | "heuristic";
}> {
  const groundingParts: string[] = [];

  for (const analysis of context.experimentAnalyses) {
    groundingParts.push(heuristicNarrative(analysis));
  }
  for (const flag of context.flags) {
    groundingParts.push(heuristicRolloutAdvice(flag, context.environmentId));
  }

  const grounding = groundingParts.join("\n\n") || "No experiments or flags recorded yet.";

  const groqAnswer = await callGroq(question, grounding);
  if (groqAnswer) {
    return { answer: groqAnswer, source: "groq" };
  }

  const q = question.toLowerCase();
  let answer: string;

  if (context.experimentAnalyses.length === 0 && context.flags.length === 0) {
    answer =
      "There's no flag or experiment data in this environment yet. Create a flag or launch an experiment to get grounded recommendations here.";
  } else if (/why.*fail|failed|no effect|didn.?t work/.test(q)) {
    const failed = context.experimentAnalyses.filter((a) => a.verdict === "no_effect");
    answer = failed.length
      ? failed.map(heuristicNarrative).join("\n\n")
      : "No experiments currently show a null result — nothing to explain as a failure.";
  } else if (/prioriti|next|which experiment/.test(q)) {
    const withInsufficientData = context.experimentAnalyses.filter(
      (a) => a.verdict === "insufficient_data"
    );
    const winners = context.experimentAnalyses.filter((a) => a.verdict === "ship_winner");
    if (winners.length) {
      answer = `Ship these first — they already have significant winners:\n\n${winners
        .map(heuristicNarrative)
        .join("\n\n")}`;
    } else if (withInsufficientData.length) {
      answer = `Prioritize collecting more data on:\n\n${withInsufficientData
        .map((a) => `- ${a.experiment.name} (needs ~${a.results[0]?.requiredSampleSizePerVariant.toLocaleString()} exposures/variant)`)
        .join("\n")}`;
    } else {
      answer = "No experiment currently stands out — all running experiments show no significant effect so far.";
    }
  } else if (/significan|meaningful|trust|real/.test(q)) {
    answer = context.experimentAnalyses.map(heuristicNarrative).join("\n\n") || "No experiment data yet.";
  } else if (/rollout|increase|percentage|ship|roll out/.test(q)) {
    answer = context.flags.map((f) => heuristicRolloutAdvice(f, context.environmentId)).join("\n\n") || "No flags yet.";
  } else {
    answer = `Here's what I can see in this environment:\n\n${grounding}`;
  }

  return { answer, source: "heuristic" };
}
