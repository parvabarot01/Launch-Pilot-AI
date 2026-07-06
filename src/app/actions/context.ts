"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE_NAME, ENV_COOKIE_NAME } from "@/lib/context";

export async function switchOrgAction(formData: FormData): Promise<void> {
  const orgId = String(formData.get("orgId") ?? "");
  if (orgId) {
    cookies().set(ORG_COOKIE_NAME, orgId, { path: "/", sameSite: "lax" });
  }
  redirect("/dashboard");
}

export async function switchEnvironmentAction(formData: FormData): Promise<void> {
  const envKey = String(formData.get("envKey") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  if (envKey) {
    cookies().set(ENV_COOKIE_NAME, envKey, { path: "/", sameSite: "lax" });
  }
  redirect(returnTo);
}
