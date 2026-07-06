import fs from "fs";
import path from "path";
import type { Database } from "./types";

/**
 * Local file-backed store standing in for Supabase Postgres.
 *
 * This is the ONLY place that needs to change to connect a real database:
 * replace `readDb`/`writeDb` with Supabase client calls (same shape, table
 * per top-level key) and every repository in lib/repositories/* keeps
 * working unmodified since they only depend on this module's exports.
 */

// Resolved fresh on every call (not cached at module load) so tests can
// point LP_DB_PATH at an isolated temp file per test — see
// src/lib/testFixtures.ts. Production/dev always fall through to the
// default .data/db.json.
function getDbFile(): string {
  return process.env.LP_DB_PATH || path.join(process.cwd(), ".data", "db.json");
}

function emptyDb(): Database {
  return {
    users: [],
    organizations: [],
    memberships: [],
    environments: [],
    flags: [],
    auditLog: [],
    experiments: [],
    events: [],
    approvals: [],
    rollbackSnapshots: [],
  };
}

function ensureFile(dbFile: string): void {
  const dataDir = path.dirname(dbFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2), "utf-8");
  }
}

// A single in-process write queue keeps concurrent API route handlers from
// interleaving reads/writes against the JSON file (this app is designed to
// run as a single dev/demo instance; a real DB gets real transactions).
let writeChain: Promise<unknown> = Promise.resolve();

export function readDb(): Database {
  const dbFile = getDbFile();
  ensureFile(dbFile);
  const raw = fs.readFileSync(dbFile, "utf-8");
  return JSON.parse(raw) as Database;
}

export function mutateDb<T>(fn: (db: Database) => T): Promise<T> {
  const dbFile = getDbFile();
  const task = writeChain.then(() => {
    ensureFile(dbFile);
    const db = readDb();
    const result = fn(db);
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
    return result;
  });
  // Swallow so a failed mutation doesn't poison the chain for future calls.
  writeChain = task.catch(() => undefined);
  return task;
}

export function isUsingRealDatabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
