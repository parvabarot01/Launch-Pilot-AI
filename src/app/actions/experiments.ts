"use server";

import { revalidatePath } from "next/cache";
import { mutateDb } from "@/lib/db";
import { requireViewerContext, requireRole } from "@/lib/context";
import { newId } from "@/lib/ids";
import { appendAudit } from "@/lib/audit";
import { createExperimentSchema, recordEventSchema } from "@/lib/validation";
import type { ActionResult } from "./auth";

export async function createExperimentAction(input: {
  environmentId: string;
  flagId: string | null;
  name: string;
  hypothesis: string;
  successMetric: string;
  minimumSampleSize: number;
  variants: { key: string; name: string; allocationPercentage: number; isControl: boolean }[];
}): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!requireRole(ctx, "member")) return { ok: false, error: "Insufficient permissions" };

  const parsed = createExperimentSchema.safeParse({ ...input, orgId: ctx.org.id });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const totalAllocation = data.variants.reduce((sum, v) => sum + v.allocationPercentage, 0);
  if (Math.round(totalAllocation) !== 100) {
    return { ok: false, error: "Variant allocations must add up to 100%" };
  }
  if (!data.variants.some((v) => v.isControl)) {
    return { ok: false, error: "One variant must be marked as control" };
  }

  const experimentId = newId("exp");
  await mutateDb((db) => {
    db.experiments.push({
      id: experimentId,
      orgId: ctx.org.id,
      environmentId: data.environmentId,
      flagId: data.flagId ?? null,
      name: data.name,
      hypothesis: data.hypothesis,
      successMetric: data.successMetric,
      minimumSampleSize: data.minimumSampleSize,
      status: "draft",
      variants: data.variants.map((v) => ({ id: newId("var"), ...v })),
      createdAt: new Date().toISOString(),
      createdBy: ctx.user.id,
      startedAt: null,
      endedAt: null,
    });

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "experiment.created",
      entityType: "experiment",
      entityId: experimentId,
      before: null,
      after: { name: data.name },
    });
  });

  revalidatePath("/dashboard/experiments");
  return { ok: true };
}

export async function changeExperimentStatusAction(
  experimentId: string,
  status: "running" | "completed" | "archived"
): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!requireRole(ctx, "member")) return { ok: false, error: "Insufficient permissions" };

  const result = await mutateDb((db) => {
    const experiment = db.experiments.find((e) => e.id === experimentId && e.orgId === ctx.org.id);
    if (!experiment) return { ok: false as const, error: "Experiment not found" };

    const before = experiment.status;
    experiment.status = status;
    if (status === "running" && !experiment.startedAt) {
      experiment.startedAt = new Date().toISOString();
    }
    if (status === "completed" || status === "archived") {
      experiment.endedAt = new Date().toISOString();
    }

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "experiment.status_changed",
      entityType: "experiment",
      entityId: experimentId,
      before: { status: before },
      after: { status },
    });

    return { ok: true as const };
  });

  revalidatePath(`/dashboard/experiments/${experimentId}`);
  revalidatePath("/dashboard/experiments");
  return result;
}

/**
 * Records a single exposure/conversion/revenue event for an experiment.
 * Used both by the demo "simulate traffic" control in the UI and available
 * as the same primitive a real consuming app's SDK integration would call.
 */
export async function recordEventAction(input: {
  experimentId: string;
  variantId: string;
  eventType: "exposure" | "conversion" | "revenue" | "custom";
  subjectId: string;
  value?: number;
}): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const parsed = recordEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await mutateDb((db) => {
    const experiment = db.experiments.find(
      (e) => e.id === data.experimentId && e.orgId === ctx.org.id
    );
    if (!experiment) return;
    db.events.push({
      id: newId("evt"),
      experimentId: data.experimentId,
      variantId: data.variantId,
      eventType: data.eventType,
      subjectId: data.subjectId,
      value: data.value,
      createdAt: new Date().toISOString(),
    });
  });

  revalidatePath(`/dashboard/experiments/${input.experimentId}`);
  return { ok: true };
}

/** Generates a batch of realistic simulated traffic for demo purposes. */
export async function simulateTrafficAction(
  experimentId: string,
  exposuresPerVariant: number
): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!requireRole(ctx, "member")) return { ok: false, error: "Insufficient permissions" };

  await mutateDb((db) => {
    const experiment = db.experiments.find(
      (e) => e.id === experimentId && e.orgId === ctx.org.id
    );
    if (!experiment) return;

    const now = new Date().toISOString();
    for (const variant of experiment.variants) {
      // Control converts around 10%; non-control variants get a randomized
      // lift so the significance engine has something realistic to chew on.
      const baseRate = 0.1;
      const rate = variant.isControl ? baseRate : baseRate * (0.85 + Math.random() * 0.5);

      for (let i = 0; i < exposuresPerVariant; i++) {
        const subjectId = newId("sim");
        db.events.push({
          id: newId("evt"),
          experimentId,
          variantId: variant.id,
          eventType: "exposure",
          subjectId,
          value: 1,
          createdAt: now,
        });
        if (Math.random() < rate) {
          db.events.push({
            id: newId("evt"),
            experimentId,
            variantId: variant.id,
            eventType: "conversion",
            subjectId,
            value: 1,
            createdAt: now,
          });
        }
      }
    }
  });

  revalidatePath(`/dashboard/experiments/${experimentId}`);
  return { ok: true };
}
