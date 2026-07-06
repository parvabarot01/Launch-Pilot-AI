import { cookies } from "next/headers";
import { readDb } from "./db";
import { getCurrentUser, getMembership, roleAtLeast } from "./auth";
import type { Environment, Membership, Organization, Role, User } from "./types";

const ORG_COOKIE = "lp_org_id";
const ENV_COOKIE = "lp_env_key";

export interface ViewerContext {
  user: User;
  org: Organization;
  membership: Membership;
  environments: Environment[];
  environment: Environment;
  memberships: (Membership & { org: Organization })[];
}

/**
 * Resolves the signed-in user's active org + environment for the current
 * request. Returns null if not signed in or has no org (shouldn't happen
 * post-signup, since signup always creates one).
 */
export function requireViewerContext(): ViewerContext | null {
  const user = getCurrentUser();
  if (!user) return null;

  const db = readDb();
  const myMemberships = db.memberships.filter((m) => m.userId === user.id);
  if (myMemberships.length === 0) return null;

  const cookieOrgId = cookies().get(ORG_COOKIE)?.value;
  const activeMembership =
    myMemberships.find((m) => m.orgId === cookieOrgId) ?? myMemberships[0];

  const org = db.organizations.find((o) => o.id === activeMembership.orgId);
  if (!org) return null;

  const environments = db.environments
    .filter((e) => e.orgId === org.id)
    .sort((a, b) => a.key.localeCompare(b.key));

  const cookieEnvKey = cookies().get(ENV_COOKIE)?.value;
  const environment =
    environments.find((e) => e.key === cookieEnvKey) ??
    environments.find((e) => e.key === "development") ??
    environments[0];

  const memberships = myMemberships
    .map((m) => ({ ...m, org: db.organizations.find((o) => o.id === m.orgId)! }))
    .filter((m) => m.org);

  return { user, org, membership: activeMembership, environments, environment, memberships };
}

export function requireRole(ctx: ViewerContext, minimum: Role): boolean {
  return roleAtLeast(ctx.membership.role, minimum);
}

export const ORG_COOKIE_NAME = ORG_COOKIE;
export const ENV_COOKIE_NAME = ENV_COOKIE;
