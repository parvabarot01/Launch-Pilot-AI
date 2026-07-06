/**
 * In-memory brute-force protection for login attempts, keyed by email.
 * Locks out after too many failed attempts within a window rather than
 * limiting successful traffic (that's what src/lib/ratelimit.ts is for).
 *
 * Single-instance only, like the rest of the in-memory adapters in this
 * app — fine for a dev/demo deployment, revisit alongside the Upstash
 * swap noted in ARCHITECTURE.md if this ever runs multi-instance.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

interface Attempts {
  count: number;
  lockedUntil: number | null;
  windowStart: number;
}

const attemptsByEmail = new Map<string, Attempts>();

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function isLockedOut(email: string): { locked: boolean; retryAfterSeconds: number } {
  const entry = attemptsByEmail.get(normalize(email));
  if (!entry || !entry.lockedUntil) return { locked: false, retryAfterSeconds: 0 };
  const now = Date.now();
  if (entry.lockedUntil <= now) return { locked: false, retryAfterSeconds: 0 };
  return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
}

export function recordFailedLogin(email: string): void {
  const key = normalize(email);
  const now = Date.now();
  const existing = attemptsByEmail.get(key);

  if (!existing || now - existing.windowStart > LOCKOUT_MS) {
    attemptsByEmail.set(key, { count: 1, lockedUntil: null, windowStart: now });
    return;
  }

  existing.count += 1;
  if (existing.count >= MAX_FAILED_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_MS;
  }
}

export function clearFailedLogins(email: string): void {
  attemptsByEmail.delete(normalize(email));
}
