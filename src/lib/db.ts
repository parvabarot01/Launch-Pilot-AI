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

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

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

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb(), null, 2), "utf-8");
  }
}

// A single in-process write queue keeps concurrent API route handlers from
// interleaving reads/writes against the JSON file (this app is designed to
// run as a single dev/demo instance; a real DB gets real transactions).
let writeChain: Promise<unknown> = Promise.resolve();

export function readDb(): Database {
  ensureFile();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw) as Database;
}

export function mutateDb<T>(fn: (db: Database) => T): Promise<T> {
  const task = writeChain.then(() => {
    ensureFile();
    const db = readDb();
    const result = fn(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    return result;
  });
  // Swallow so a failed mutation doesn't poison the chain for future calls.
  writeChain = task.catch(() => undefined);
  return task;
}

export function isUsingRealDatabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
