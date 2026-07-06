import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { mutateDb } from "./db";
import { newId, newApiKey } from "./ids";
import { hashPassword } from "./auth";
import type { ViewerContext } from "./context";
import type { Environment, EnvironmentKey, Membership, Organization, Role, User } from "./types";

const DEFAULT_ENVIRONMENTS: EnvironmentKey[] = ["development", "staging", "production"];

/**
 * Points src/lib/db.ts at an isolated temp file for the duration of a test,
 * so Server Action integration tests exercise the real read/write path
 * without touching (or being polluted by) the real .data/db.json used by
 * `npm run dev`. Call `cleanup()` when done (a t.after() hook works well).
 */
export function useTempDb(): { cleanup: () => void } {
  const dbPath = path.join(os.tmpdir(), `lp-test-${crypto.randomUUID()}.json`);
  process.env.LP_DB_PATH = dbPath;
  return {
    cleanup: () => {
      delete process.env.LP_DB_PATH;
      try {
        fs.unlinkSync(dbPath);
      } catch {
        // already gone, fine
      }
    },
  };
}

export async function seedOrg(name = "Test Org"): Promise<{ org: Organization; environments: Environment[] }> {
  const orgId = newId("org");
  const now = new Date().toISOString();
  const environments: Environment[] = DEFAULT_ENVIRONMENTS.map((key) => ({
    id: newId("env"),
    orgId,
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    apiKey: newApiKey(),
    createdAt: now,
  }));
  const org: Organization = { id: orgId, name, slug: name.toLowerCase().replace(/\s+/g, "-"), createdAt: now };

  await mutateDb((db) => {
    db.organizations.push(org);
    db.environments.push(...environments);
  });

  return { org, environments };
}

/** Adds a new user as a member of an existing seeded org, at the given role. */
export async function seedUserInOrg(
  org: Organization,
  environments: Environment[],
  role: Role = "owner",
  overrides: Partial<Pick<User, "name" | "email">> = {}
): Promise<ViewerContext> {
  const userId = newId("user");
  const now = new Date().toISOString();
  const { hash, salt } = hashPassword("test-password-123");
  const user: User = {
    id: userId,
    email: overrides.email ?? `${userId}@example.com`,
    passwordHash: hash,
    passwordSalt: salt,
    name: overrides.name ?? "Test User",
    createdAt: now,
  };
  const membership: Membership = {
    id: newId("mem"),
    orgId: org.id,
    userId,
    role,
    createdAt: now,
  };

  await mutateDb((db) => {
    db.users.push(user);
    db.memberships.push(membership);
  });

  const environment = environments.find((e) => e.key === "development")!;

  return {
    user,
    org,
    membership,
    environments,
    environment,
    memberships: [{ ...membership, org }],
  };
}

/** Convenience: a fresh org with a single user of the given role. */
export async function seedViewerContext(role: Role = "owner"): Promise<ViewerContext> {
  const { org, environments } = await seedOrg();
  return seedUserInOrg(org, environments, role);
}
