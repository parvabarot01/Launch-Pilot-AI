"use server";

import { revalidatePath } from "next/cache";
import { mutateDb } from "@/lib/db";
import { requireViewerContext, requireRole, type ViewerContext } from "@/lib/context";
import { appendAudit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import type { ActionResult } from "./auth";

export async function decideApprovalCore(
  ctx: ViewerContext,
  approvalId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  if (!requireRole(ctx, "admin")) {
    return { ok: false, error: "Only admins or owners can review rollout approvals" };
  }
  // Server Actions are callable directly at runtime, where TypeScript's
  // union type offers no protection — validate the value at runtime too.
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, error: "Invalid decision" };
  }

  return mutateDb((db) => {
    const approval = db.approvals.find((a) => a.id === approvalId && a.orgId === ctx.org.id);
    if (!approval) return { ok: false as const, error: "Approval request not found" };
    if (approval.status !== "pending") {
      return { ok: false as const, error: "This request was already reviewed" };
    }

    approval.status = decision;
    approval.reviewedBy = ctx.user.id;
    approval.reviewedByName = ctx.user.name;
    approval.reviewedAt = new Date().toISOString();

    if (decision === "approved") {
      const flag = db.flags.find((f) => f.id === approval.flagId);
      const state = flag?.environments.find((e) => e.environmentId === approval.environmentId);
      if (state) {
        db.rollbackSnapshots.push({
          id: newId("snap"),
          flagId: approval.flagId,
          environmentId: approval.environmentId,
          state: { ...state, targetingRules: [...state.targetingRules] },
          createdAt: new Date().toISOString(),
          label: "Auto-snapshot before approved rollout increase",
        });
        state.rolloutPercentage = approval.toRolloutPercentage;
        state.updatedAt = new Date().toISOString();
        state.updatedBy = ctx.user.id;
      }
    }

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: decision === "approved" ? "approval.approved" : "approval.rejected",
      entityType: "approval",
      entityId: approvalId,
      before: { status: "pending" },
      after: { status: decision },
    });

    return { ok: true as const };
  });
}

export async function decideApprovalAction(
  approvalId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const ctx = await requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await decideApprovalCore(ctx, approvalId, decision);

  revalidatePath("/dashboard/governance");
  revalidatePath("/dashboard/flags");
  return result;
}
