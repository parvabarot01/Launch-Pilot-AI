import crypto from "crypto";

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function newApiKey(): string {
  return `lp_${crypto.randomBytes(24).toString("hex")}`;
}
