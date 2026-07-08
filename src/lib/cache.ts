import { Redis } from "@upstash/redis";

/**
 * Flag-evaluation cache. Backed by Upstash Redis when configured, an
 * in-memory Map otherwise. Keys are namespaced under "launchpilot:" since
 * this Upstash database is shared with another project on the same account.
 */

const PREFIX = "launchpilot:";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

function useRemote(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL);
}

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

export const cache = {
  isRemote: useRemote(),

  async get<T>(key: string): Promise<T | null> {
    if (useRemote()) {
      const value = await getRedis().get<T>(PREFIX + key);
      return value ?? null;
    }
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (useRemote()) {
      await getRedis().set(PREFIX + key, value, { ex: ttlSeconds });
      return;
    }
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async invalidate(key: string): Promise<void> {
    if (useRemote()) {
      await getRedis().del(PREFIX + key);
      return;
    }
    store.delete(key);
  },

  async invalidatePrefix(prefix: string): Promise<void> {
    if (useRemote()) {
      const keys = await getRedis().keys(`${PREFIX}${prefix}*`);
      if (keys.length) await getRedis().del(...keys);
      return;
    }
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};
