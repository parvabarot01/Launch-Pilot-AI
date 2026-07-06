/**
 * Flag-evaluation cache. Interface intentionally mirrors the Upstash Redis
 * REST client (`get`/`set` with a TTL) so swapping the in-memory Map below
 * for `@upstash/redis` is a body-only change in this one file — nothing
 * that calls `cache.get`/`cache.set` needs to change.
 *
 * Swap point: when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
 * set, replace the Map implementation with Upstash REST calls.
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export const cache = {
  isRemote: Boolean(process.env.UPSTASH_REDIS_REST_URL),

  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  set(key: string, value: unknown, ttlSeconds: number): void {
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};
