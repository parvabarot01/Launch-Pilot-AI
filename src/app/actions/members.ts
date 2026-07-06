"use server";

import { revalidatePath } from "next/cache";
import { mutateDb } from "@/lib/db";
import { requireViewerContext, requireRole } from "@/lib/context";
import { appendAudit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import type { Role } from "@/lib/types";
import type { ActionResult } from "./auth";

const VALID_ROLES: Role[] = ["viewer", "member", "admin", "owner"];

/**
 * Adds an existing LaunchPilot user (by email) to the current org. Since
 * there's no connected email service yet, invites are direct adds rather
 * than emailed invite links — swap point noted in ARCHITECTURE.md.
 */
export async function addMemberAction(formData: FormData): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!requireRole(ctx, "admin")) return { ok: false, error: "Insufficient permissions" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as Role;
  if (!email) return { ok: false, error: "Email is required" };
  if (!VALID_ROLES.includes(role)) return { ok: false, error: "Invalid role" };

  const result = await mutateDb((db) => {
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return {
        ok: false as const,
        error: "No LaunchPilot account exists for that email yet — ask them to sign up first",
      };
    }
    if (db.memberships.some((m) => m.orgId === ctx.org.id && m.userId === user.id)) {
      return { ok: false as const, error: "That user is already a member of this org" };
    }

    db.memberships.push({
      id: newId("mem"),
      orgId: ctx.org.id,
      userId: user.id,
      role,
      createdAt: new Date().toISOString(),
    });

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "org.member_added",
      entityType: "organization",
      entityId: ctx.org.id,
      before: null,
      after: { email, role },
    });

    return { ok: true as const };
  });

  revalidatePath("/dashboard/settings");
  return result;
}

export async function changeMemberRoleAction(
  membershipId: string,
  role: Role
): Promise<ActionResult> {
  const ctx = requireViewerContext();
  if (!ctx) return { ok: false, error: "Not signed in" };
  if (!requireRole(ctx, "owner")) return { ok: false, error: "Only the org owner can change roles" };

  const result = await mutateDb((db) => {
    const membership = db.memberships.find((m) => m.id === membershipId && m.orgId === ctx.org.id);
    if (!membership) return { ok: false as const, error: "Member not found" };
    const before = membership.role;
    membership.role = role;

    appendAudit(db, {
      orgId: ctx.org.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      action: "org.member_role_changed",
      entityType: "organization",
      entityId: membershipId,
      before: { role: before },
      after: { role },
    });

    return { ok: true as const };
  });

  revalidatePath("/dashboard/settings");
  return result;
}
