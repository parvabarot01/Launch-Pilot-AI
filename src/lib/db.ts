import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Single source of truth for the app's data: either a local JSON file
 * (default, and always used under `LP_DB_PATH` so tests stay isolated from
 * any real database) or one row of JSONB in Supabase Postgres when
 * NEXT_PUBLIC_SUPABASE_URL is configured. Every repository only calls
 * readDb/mutateDb, so this is the one file that changes per backend.
 */

const SNAPSHOT_TABLE = "db_snapshot";
const SNAPSHOT_ROW_ID = 1;

// LP_DB_PATH always forces local-file mode (see src/lib/testFixtures.ts) so
// integration tests never touch a real Supabase project even if Supabase
// env vars happen to be set in the shell running them.
function useRemoteDb(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && !process.env.LP_DB_PATH;
}

export function isUsingRealDatabase(): boolean {
  return useRemoteDb();
}

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    }
    // service_role key: server-only, bypasses RLS. This module is never
    // imported from a "use client" component.
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabase;
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

async function readRemoteDb(): Promise<Database> {
  const { data, error } = await getSupabase()
    .from(SNAPSHOT_TABLE)
    .select("data")
    .eq("id", SNAPSHOT_ROW_ID)
    .maybeSingle();

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (data?.data) return data.data as Database;

  // First run against a fresh project: seed the singleton row.
  const seeded = emptyDb();
  const { error: insertError } = await getSupabase()
    .from(SNAPSHOT_TABLE)
    .upsert({ id: SNAPSHOT_ROW_ID, data: seeded });
  if (insertError) throw new Error(`Supabase seed failed: ${insertError.message}`);
  return seeded;
}

async function writeRemoteDb(db: Database): Promise<void> {
  const { error } = await getSupabase()
    .from(SNAPSHOT_TABLE)
    .update({ data: db, updated_at: new Date().toISOString() })
    .eq("id", SNAPSHOT_ROW_ID);
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

// Resolved fresh on every call (not cached at module load) so tests can
// point LP_DB_PATH at an isolated temp file per test — see
// src/lib/testFixtures.ts.
function getDbFile(): string {
  return process.env.LP_DB_PATH || path.join(process.cwd(), ".data", "db.json");
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

function readLocalDb(): Database {
  const dbFile = getDbFile();
  ensureFile(dbFile);
  const raw = fs.readFileSync(dbFile, "utf-8");
  return JSON.parse(raw) as Database;
}

function writeLocalDb(db: Database): void {
  const dbFile = getDbFile();
  ensureFile(dbFile);
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
}

export async function readDb(): Promise<Database> {
  return useRemoteDb() ? readRemoteDb() : readLocalDb();
}

// A single in-process write queue keeps concurrent calls within this
// instance from interleaving reads/writes. Real cross-instance concurrency
// safety would need a Postgres transaction (e.g. SELECT ... FOR UPDATE via
// an RPC function) rather than a plain read-modify-write of one row; at
// this app's traffic level that's an accepted tradeoff, same spirit as the
// local JSON file's single-instance limitation.
let writeChain: Promise<unknown> = Promise.resolve();

export function mutateDb<T>(fn: (db: Database) => T): Promise<T> {
  const task = writeChain.then(async () => {
    const db = await readDb();
    const result = fn(db);
    if (useRemoteDb()) {
      await writeRemoteDb(db);
    } else {
      writeLocalDb(db);
    }
    return result;
  });
  // Swallow so a failed mutation doesn't poison the chain for future calls.
  writeChain = task.catch(() => undefined);
  return task;
}
