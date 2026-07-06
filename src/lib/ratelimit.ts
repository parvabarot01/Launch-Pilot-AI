/**
 * Fixed-window rate limiter for the flag-evaluation endpoint, the
 * highest-traffic path in this product. Interface mirrors
 * `@upstash/ratelimit` (`.limit(identifier) -> { success, remaining }`) so
 * swapping to real Upstash-backed rate limiting later is a body-only
 * change in this file.
 *
 * Swap point: when UPSTASH_REDIS_REST_URL is set, back this with
 * @upstash/ratelimit + @upstash/redis instead of the Map below.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 600; // per environment API key

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export const ratelimit = {
  isRemote: Boolean(process.env.UPSTASH_REDIS_REST_URL),

  limit(identifier: string): { success: boolean; remaining: number; resetAt: number } {
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
