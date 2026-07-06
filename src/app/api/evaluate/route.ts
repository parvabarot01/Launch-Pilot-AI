import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { cache } from "@/lib/cache";
import { ratelimit } from "@/lib/ratelimit";
import { evaluateFlagState } from "@/lib/evaluate";
import { evaluateFlagSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Public flag-evaluation endpoint. This is the one real external HTTP API
 * in the product — everything a consuming app's LaunchPilot SDK calls.
 * Authenticated by per-environment API key (not a user session), cached,
 * and rate-limited since this is the highest-traffic path in the system.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = evaluateFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { apiKey, flagKey, context } = parsed.data;

  const limit = ratelimit.limit(apiKey);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const db = readDb();
  const environment = db.environments.find((e) => e.apiKey === apiKey);
  if (!environment) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const flag = db.flags.find(
    (f) => f.orgId === environment.orgId && f.key === flagKey && !f.archivedAt
  );

  const subjectId = context.userId || context.anonymousId || request.ip || "anonymous";
  const cacheKey = `eval:${environment.id}:${flagKey}:${subjectId}:${JSON.stringify(context)}`;

  const cached = cache.get<{ enabled: boolean; reason: string }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  const state = flag?.environments.find((e) => e.environmentId === environment.id);
  const result = evaluateFlagState(state, flagKey, subjectId, context);

  cache.set(cacheKey, result, 5);

  return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
}
