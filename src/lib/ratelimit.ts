import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Fixed-window rate limiter for the flag-evaluation endpoint, the
 * highest-traffic path in this product. Backed by Upstash Ratelimit when
 * configured, an in-memory fixed window otherwise. Keys are namespaced
 * under "launchpilot:rl" since this Upstash database is shared with
 * another project on the same account.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 600; // per environment API key

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function useRemote(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL);
}

let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.fixedWindow(MAX_REQUESTS_PER_WINDOW, "60 s"),
      prefix: "launchpilot:rl",
    });
  }
  return limiter;
}

export const ratelimit = {
  isRemote: useRemote(),

  async limit(identifier: string): Promise<{ success: boolean; remaining: number; resetAt: number }> {
    if (useRemote()) {
      const result = await getLimiter().limit(identifier);
      return { success: result.success, remaining: result.remaining, resetAt: result.reset };
    }

    const now = Date.now();
    const existing = windows.get(identifier);

    if (!existing || existing.resetAt < now) {
      const resetAt = now + WINDOW_MS;
      windows.set(identifier, { count: 1, resetAt });
      return { success: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt };
    }

    existing.count += 1;
    const success = existing.count <= MAX_REQUESTS_PER_WINDOW;
    return {
      success,
      remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - existing.count),
      resetAt: existing.resetAt,
    };
  },
};
