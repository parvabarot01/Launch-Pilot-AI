"use server";

import { revalidatePath } from "next/cache";
import { mutateDb } from "@/lib/db";
import { requireViewerContext, requireRole, type ViewerContext } from "@/lib/context";
import { appendAudit } from "@/lib/audit";
import { newApiKey } from "@/lib/ids";
import type { ActionResult } from "./auth";

/**
 * Rotates an environment's API key. The old key stops working immediately
 * — any consuming app's SDK using it will fail evaluation calls until
 * updated with the new key. Admin/owner only since this can break a live
 * integration.
 */
export async function regenerateApiKeyCore(ctx: ViewerContext, environmentId: string): Promise<ActionResult> {
  if (!requireRole(ctx, "admin")) {
    return { ok: false, error: "Only admins or owners can rotate API keys" };
  }

  return mutateDb((db) => {
    const environment = db.environments.find((e) => e.id === environmentId && e.orgId === ctx.org.id);
    if (!environment) return { ok: false as const, error: "Environment not found" };

    const before = { apiKeyLastFour: environment.apiKey.slice(-4) };
    environment.apiKey = newApiKey();

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "environment.api_key_regenerated",
      entityType: "environment",
      entityId: environment.id,
      before,
      after: { apiKeyLastFour: environment.apiKey.slice(-4) },
    });

    return { ok: true as const };
  });
}

export async function regenerateApiKeyAction(environmentId: string): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };

  const result = await regenerateApiKeyCore(ctx, environmentId);

  revalidatePath("/dashboard/settings");
  return result;
}
