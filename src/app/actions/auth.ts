"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { mutateDb, readDb } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { newId, newApiKey } from "@/lib/ids";
import { loginSchema, signupSchema } from "@/lib/validation";
import { isLockedOut, recordFailedLogin, clearFailedLogins } from "@/lib/loginThrottle";
import type { Environment, EnvironmentKey, Organization } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type ResolvedAuth = { ok: true; userId: string } | { ok: false; error: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const DEFAULT_ENVIRONMENTS: EnvironmentKey[] = ["development", "staging", "production"];

/**
 * All the signup business logic (validation, uniqueness, creating the
 * user/org/membership/environments) with no Next.js runtime dependency —
 * testable directly. `signupAction` below is the thin cookie/redirect
 * wrapper around this.
 */
export async function resolveSignup(input: {
  name: unknown;
  email: unknown;
  password: unknown;
  orgName: unknown;
}): Promise<ResolvedAuth> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }
  const { name, email, password, orgName } = parsed.data;

  const existing = readDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { ok: false, error: "An account with that email already exists" };
  }

  const { hash, salt } = hashPassword(password);
  const userId = newId("user");
  const orgId = newId("org");

  await mutateDb((db) => {
    db.users.push({
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      name,
      createdAt: new Date().toISOString(),
    });

    const org: Organization = {
      id: orgId,
      name: orgName,
      slug: slugify(orgName) || orgId,
      createdAt: new Date().toISOString(),
    };
    db.organizations.push(org);

    db.memberships.push({
      id: newId("mem"),
      orgId,
      userId,
      role: "owner",
      createdAt: new Date().toISOString(),
    });

    for (const key of DEFAULT_ENVIRONMENTS) {
      const env: Environment = {
        id: newId("env"),
        orgId,
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        apiKey: newApiKey(),
        createdAt: new Date().toISOString(),
      };
      db.environments.push(env);
    }
  });

  return { ok: true, userId };
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const result = await resolveSignup({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
  });
  if (!result.ok) return result;

  const token = createSessionToken(result.userId);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  redirect("/dashboard");
}

/**
 * All the login business logic (validation, brute-force lockout,
 * password verification) with no Next.js runtime dependency — testable
 * directly. `loginAction` below is the thin cookie/redirect wrapper.
 */
export async function resolveLogin(input: { email: unknown; password: unknown }): Promise<ResolvedAuth> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password" };
  }
  const { email, password } = parsed.data;

  const lockout = isLockedOut(email);
  if (lockout.locked) {
    const minutes = Math.ceil(lockout.retryAfterSeconds / 60);
    return { ok: false, error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  const user = readDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    recordFailedLogin(email);
    return { ok: false, error: "Invalid email or password" };
  }
  clearFailedLogins(email);

  return { ok: true, userId: user.id };
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const result = await resolveLogin({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.ok) return result;

  const token = createSessionToken(result.userId);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
