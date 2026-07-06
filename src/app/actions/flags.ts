"use server";

import { revalidatePath } from "next/cache";
import { mutateDb } from "@/lib/db";
import { requireViewerContext, requireRole, type ViewerContext } from "@/lib/context";
import { newId } from "@/lib/ids";
import { appendAudit } from "@/lib/audit";
import { computeRiskScore, requiresApproval } from "@/lib/governance";
import { createFlagSchema, targetingRuleSchema, updateFlagStateSchema } from "@/lib/validation";
import type { FlagEnvironmentState, TargetingRule } from "@/lib/types";
import type { ActionResult } from "./auth";
import { z } from "zod";

/**
 * Core business logic, factored out from the Server Action wrapper so it
 * can be unit/integration-tested directly with a constructed ViewerContext
 * — no Next.js request runtime (cookies/redirect/revalidatePath) involved.
 * The exported *Action functions below are thin wrappers: resolve ctx,
 * delegate to *Core, then handle the Next.js-specific side effects.
 */
export async function createFlagCore(
  ctx: ViewerContext,
  input: { key: unknown; name: unknown; description: unknown }
): Promise<ActionResult> {
  if (!requireRole(ctx, "member")) return { ok: false, error: "Insufficient permissions" };

  const parsed = createFlagSchema.safeParse({
    orgId: ctx.org.id,
    key: input.key,
    name: input.name,
    description: input.description || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const { key, name, description } = parsed.data;

  return mutateDb((db) => {
    if (db.flags.some((f) => f.orgId === ctx.org.id && f.key === key)) {
      return { ok: false as const, error: "A flag with that key already exists" };
    }
    const now = new Date().toISOString();
    const environments: FlagEnvironmentState[] = db.environments
      .filter((e) => e.orgId === ctx.org.id)
      .map((e) => ({
        environmentId: e.id,
        enabled: false,
        killSwitch: false,
        rolloutPercentage: 0,
        targetingRules: [],
        updatedAt: now,
        updatedBy: ctx.user.id,
      }));

    const flagId = newId("flag");
    db.flags.push({
      id: flagId,
      orgId: ctx.org.id,
      key,
      name,
      description,
      createdAt: now,
      createdBy: ctx.user.id,
      archivedAt: null,
      environments,
    });

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "flag.created",
      entityType: "flag",
      entityId: flagId,
      before: null,
      after: { key, name },
    });

    return { ok: true as const };
  });
}

export async function createFlagAction(formData: FormData): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await createFlagCore(ctx, {
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") || "",
  });

  revalidatePath("/dashboard/flags");
  return result;
}

const updateStateFormSchema = updateFlagStateSchema.extend({
  targetingRules: z.array(targetingRuleSchema).optional(),
});

export interface UpdateFlagStateInput {
  environmentId: string;
  enabled?: boolean;
  killSwitch?: boolean;
  rolloutPercentage?: number;
  targetingRules?: Omit<TargetingRule, "id">[];
  reason?: string;
}

export async function updateFlagStateCore(
  ctx: ViewerContext,
  flagId: string,
  input: UpdateFlagStateInput
): Promise<ActionResult & { approvalRequested?: boolean }> {
  if (!requireRole(ctx, "member")) return { ok: false, error: "Insufficient permissions" };

  const parsed = updateStateFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  return mutateDb((db) => {
    const flag = db.flags.find((f) => f.id === flagId && f.orgId === ctx.org.id);
    if (!flag) return { ok: false as const, error: "Flag not found" };

    const state = flag.environments.find((e) => e.environmentId === data.environmentId);
    if (!state) return { ok: false as const, error: "Environment not found for this flag" };

    const environment = db.environments.find((e) => e.id === data.environmentId);
    const before: FlagEnvironmentState = { ...state, targetingRules: [...state.targetingRules] };

    // Rollout percentage increases past the governance threshold require
    // sign-off from an admin/owner instead of applying immediately.
    if (
      data.rolloutPercentage !== undefined &&
      data.rolloutPercentage > state.rolloutPercentage &&
      requiresApproval(state.rolloutPercentage, data.rolloutPercentage) &&
      environment
    ) {
      const recentRollbacks = db.rollbackSnapshots.filter(
        (s) => s.flagId === flagId && s.environmentId === data.environmentId
      ).length;
      const risk = computeRiskScore({
        fromPercentage: state.rolloutPercentage,
        toPercentage: data.rolloutPercentage,
        environmentKey: environment.key,
        hasActiveExperimentAttached: db.experiments.some(
          (e) => e.flagId === flagId && e.status === "running"
        ),
        recentRollbackCount: recentRollbacks,
      });

      const approvalId = newId("appr");
      db.approvals.push({
        id: approvalId,
        orgId: ctx.org.id,
        flagId,
        environmentId: data.environmentId,
        requestedBy: ctx.user.id,
        requestedByName: ctx.user.name,
        fromRolloutPercentage: state.rolloutPercentage,
        toRolloutPercentage: data.rolloutPercentage,
        riskScore: risk.score,
        riskFactors: risk.factors,
        status: "pending",
        reviewedBy: null,
        reviewedByName: null,
        reason: data.reason ?? "",
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      });

      appendAudit(db, {
        orgId: ctx.org.id,
        actorId: ctx.user.id,
        actorName: ctx.user.name,
        action: "approval.requested",
        entityType: "approval",
        entityId: approvalId,
        before: { rolloutPercentage: state.rolloutPercentage },
        after: { requestedRolloutPercentage: data.rolloutPercentage, riskScore: risk.score },
      });

      // Still apply any non-rollout changes bundled in the same request
      // (e.g. targeting rule edits alongside a big rollout ask).
      if (data.enabled !== undefined) state.enabled = data.enabled;
      if (data.killSwitch !== undefined) state.killSwitch = data.killSwitch;
      if (data.targetingRules !== undefined) {
        state.targetingRules = data.targetingRules.map((r) => ({ id: newId("rule"), ...r }));
      }
      state.updatedAt = new Date().toISOString();
      state.updatedBy = ctx.user.id;

      return { ok: true as const, approvalRequested: true };
    }

    // Snapshot before mutating, for one-click rollback later.
    db.rollbackSnapshots.push({
      id: newId("snap"),
      flagId,
      environmentId: data.environmentId,
      state: before,
      createdAt: new Date().toISOString(),
      label: data.reason || "Auto-snapshot before change",
    });
    // Keep only the last 10 snapshots per flag+environment.
    const snapshotsForTarget = db.rollbackSnapshots
      .filter((s) => s.flagId === flagId && s.environmentId === data.environmentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (snapshotsForTarget.length > 10) {
      const toRemove = snapshotsForTarget.slice(0, snapshotsForTarget.length - 10);
      db.rollbackSnapshots = db.rollbackSnapshots.filter((s) => !toRemove.includes(s));
    }

    if (data.enabled !== undefined) state.enabled = data.enabled;
    if (data.killSwitch !== undefined) state.killSwitch = data.killSwitch;
    if (data.rolloutPercentage !== undefined) state.rolloutPercentage = data.rolloutPercentage;
    if (data.targetingRules !== undefined) {
      state.targetingRules = data.targetingRules.map((r) => ({ id: newId("rule"), ...r }));
    }
    state.updatedAt = new Date().toISOString();
    state.updatedBy = ctx.user.id;

    const action = data.killSwitch !== undefined
      ? "flag.kill_switch_toggled"
      : data.rolloutPercentage !== undefined
      ? "flag.rollout_changed"
      : data.targetingRules !== undefined
      ? "flag.targeting_updated"
      : "flag.updated";

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action,
      entityType: "flag",
      entityId: flagId,
      before,
      after: state,
    });

    return { ok: true as const };
  });
}

export async function updateFlagStateAction(
  flagId: string,
  input: UpdateFlagStateInput
): Promise<ActionResult & { approvalRequested?: boolean }> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await updateFlagStateCore(ctx, flagId, input);

  revalidatePath(`/dashboard/flags/${flagId}`);
  revalidatePath("/dashboard/flags");
  return result;
}

export async function archiveFlagCore(ctx: ViewerContext, flagId: string): Promise<ActionResult> {
  if (!requireRole(ctx, "admin")) return { ok: false, error: "Insufficient permissions" };

  await mutateDb((db) => {
    const flag = db.flags.find((f) => f.id === flagId && f.orgId === ctx.org.id);
    if (!flag) return;
    flag.archivedAt = new Date().toISOString();
    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "flag.archived",
      entityType: "flag",
      entityId: flagId,
      before: { archivedAt: null },
      after: { archivedAt: flag.archivedAt },
    });
  });

  return { ok: true };
}

export async function archiveFlagAction(flagId: string): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await archiveFlagCore(ctx, flagId);

  revalidatePath("/dashboard/flags");
  return result;
}

export async function rollbackFlagCore(ctx: ViewerContext, snapshotId: string): Promise<ActionResult> {
  if (!requireRole(ctx, "admin")) return { ok: false, error: "Insufficient permissions" };

  return mutateDb((db) => {
    const snapshot = db.rollbackSnapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return { ok: false as const, error: "Snapshot not found" };
    const flag = db.flags.find((f) => f.id === snapshot.flagId && f.orgId === ctx.org.id);
    if (!flag) return { ok: false as const, error: "Flag not found" };
    const state = flag.environments.find((e) => e.environmentId === snapshot.environmentId);
    if (!state) return { ok: false as const, error: "Environment not found" };

    const before = { ...state };
    state.enabled = snapshot.state.enabled;
    state.killSwitch = snapshot.state.killSwitch;
    state.rolloutPercentage = snapshot.state.rolloutPercentage;
    state.targetingRules = snapshot.state.targetingRules;
    state.updatedAt = new Date().toISOString();
    state.updatedBy = ctx.user.id;

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "rollback.performed",
      entityType: "flag",
      entityId: flag.id,
      before,
      after: state,
    });

    return { ok: true as const };
  });
}

export async function rollbackFlagAction(snapshotId: string): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await rollbackFlagCore(ctx, snapshotId);

  revalidatePath("/dashboard/flags", "layout");
  return result;
}
