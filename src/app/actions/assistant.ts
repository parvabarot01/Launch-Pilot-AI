"use server";

import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { analyzeExperiment, askAssistant } from "@/lib/ai";

export async function askAssistantAction(
  question: string
): Promise<{ ok: true; answer: string; source: "groq" | "heuristic" } | { ok: false; error: string }> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!question.trim()) return { ok: false, error: "Ask a question first" };

  const db = readDb();
  const flags = db.flags.filter((f) => f.orgId === ctx.org.id && !f.archivedAt);
  const experiments = db.experiments.filter(
    (e) => e.orgId === ctx.org.id && e.environmentId === ctx.environment.id
  );

  const experimentAnalyses = experiments.map((experiment) =>
    analyzeExperiment(
      experiment,
      db.events.filter((ev) => ev.experimentId === experiment.id)
    )
  );

  const { answer, source } = await askAssistant(question, {
    flags,
    experimentAnalyses,
    environmentId: ctx.environment.id,
  });

  return { ok: true, answer, source };
}
