-- Run once in the Supabase SQL Editor for this project.
-- Creates the single-row JSONB store that src/lib/db.ts reads/writes.
-- RLS is enabled with no policies, so only the service_role key (used
-- server-side only, never exposed to the browser) can access it — the
-- anon key gets zero access, which is correct since this app's own
-- Server Actions already enforce all auth/RBAC before ever touching db.ts.

create table if not exists db_snapshot (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint db_snapshot_singleton check (id = 1)
);

alter table db_snapshot enable row level security;

insert into db_snapshot (id, data)
values (1, '{
  "users": [], "organizations": [], "memberships": [], "environments": [],
  "flags": [], "auditLog": [], "experiments": [], "events": [],
  "approvals": [], "rollbackSnapshots": []
}'::jsonb)
on conflict (id) do nothing;
