# Architecture

## Stack

| Layer | Current (standalone) | Real-service swap-in |
|---|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind | — (unchanged) |
| Hosting | Local dev server / any Node host | Vercel free tier |
| Data store | Local JSON file (`.data/db.json`) via `src/lib/db.ts` | Supabase Postgres + RLS |
| Flag-eval cache | In-memory `Map` via `src/lib/cache.ts` | Upstash Redis |
| Rate limiting | In-memory fixed window via `src/lib/ratelimit.ts` | Upstash Ratelimit |
| Statistics | `simple-statistics` (real, not swapped) | — (unchanged) |
| AI assistant | Rule-based heuristics engine (`src/lib/ai.ts`) | Groq API, Llama 3.3 70B |
| Mutations | Next.js Server Actions (`src/app/actions/*`) | — (unchanged) |
| Public API | One real REST endpoint: `POST /api/evaluate` | — (unchanged) |
| Client SDK | Dependency-free JS (`public/sdk/launchpilot.js`) | — (unchanged) |

## Why Server Actions instead of a full REST API internally

Every internal mutation (create a flag, change a rollout, decide an
approval, ask the assistant) is a Next.js Server Action, not a hand-rolled
`route.ts` + client-side `fetch` pair. They run server-side, share the
same auth/RBAC/validation/audit path, and cut the boilerplate roughly in
half versus a parallel REST layer that only the app itself would ever
call. The one genuine external consumer — a consuming app's flag
evaluation call — gets a real REST endpoint (`/api/evaluate`) because an
external SDK needs an actual HTTP contract, not a Next.js-internal
mechanism.

## Data model

Defined in full in `src/lib/types.ts`. Summary:

```
User            — id, email, passwordHash/Salt, name
Organization    — id, name, slug
Membership      — orgId, userId, role (owner|admin|member|viewer)
Environment     — orgId, key (development|staging|production), apiKey
FeatureFlag     — orgId, key, name, description, environments[]
  FlagEnvironmentState — environmentId, enabled, killSwitch,
                          rolloutPercentage, targetingRules[]
    TargetingRule — attribute, operator, value
AuditLogEntry   — orgId, actorId, action, entityType, entityId, before, after
Experiment      — orgId, environmentId, flagId?, hypothesis, successMetric,
                   minimumSampleSize, status, variants[]
  Variant       — key, name, allocationPercentage, isControl
ExperimentEvent — experimentId, variantId, eventType, subjectId, value
ApprovalRequest — orgId, flagId, environmentId, from/toRolloutPercentage,
                   riskScore, riskFactors[], status, reviewedBy
FlagRollbackSnapshot — flagId, environmentId, state (full FlagEnvironmentState), label
```

Every top-level key in `Database` (`src/lib/types.ts`) maps 1:1 to what
would be a Postgres table — migrating to Supabase means creating matching
tables and replacing the body of `readDb`/`mutateDb` in `src/lib/db.ts`;
every repository/action calling those functions is unaffected.

## Flag evaluation design

`src/lib/evaluate.ts` — `evaluateFlagState(state, flagKey, subjectId, context)`:

1. `killSwitch` on → always off.
2. `enabled` false → always off.
3. Any targeting rule matches the request context → on (rules force-on,
   evaluated before rollout bucketing).
4. Otherwise, deterministic bucketing: `md5(flagKey:subjectId)` reduced to
   a 0-99 bucket, compared against `rolloutPercentage`. This means the
   same user always gets the same result for a given flag at a given
   rollout percentage — critical for a coherent user experience and for
   experiment variant stickiness — rather than a fresh coin flip per request.

`POST /api/evaluate` (`src/app/api/evaluate/route.ts`) wraps this with:
- API-key auth (per-environment key, not a user session — this endpoint is
  called by consuming apps, not signed-in humans)
- Rate limiting (`src/lib/ratelimit.ts`, 600 req/min per API key — this is
  the highest-traffic path in the system, called on every SDK evaluation)
- 5-second result caching (`src/lib/cache.ts`) keyed on
  `environment:flagKey:subject:context`

## Governance design

`src/lib/governance.ts`:
- `requiresApproval(from, to)` — true if the increase is ≥50 points or
  reaches 100%.
- `computeRiskScore(...)` — weighted score (0-100) from: rollout jump
  size, target environment (production weighted highest), reaching 100%,
  absence of a backing experiment, and recent rollback count for that
  flag/environment. Mapped to `low` / `medium` / `high` / `critical`.

When `updateFlagStateAction` (`src/app/actions/flags.ts`) detects a
rollout change requiring approval, it does not apply the change — it
creates an `ApprovalRequest` with the computed risk score and factors.
`decideApprovalAction` (`src/app/actions/governance.ts`) is the only path
that actually mutates the rollout percentage in that case, and only for
admin/owner roles. Every rollout mutation (approved or direct) snapshots
the prior state to `rollbackSnapshots` first.

Compliance/change-log report: `GET /api/audit-log/export`
(`src/app/api/audit-log/export/route.ts`) — session-authenticated (same
access level as the Audit Log page), streams the org's audit log as CSV,
optionally filtered by `?action=` / `?entityType=` query params. The CSV
formatting and filtering are pure functions in `src/lib/exports.ts`
(unit-tested independently of the route handler).

## AI assistant design

`src/lib/ai.ts` builds a grounding context from the org's real flags and
experiments (`analyzeExperiment` runs the same significance engine used
in the UI), then:
- If `GROQ_API_KEY` is set, sends that grounding + the user's question to
  Groq's chat completions API (`llama-3.3-70b-versatile`) with a system
  prompt constraining it to the provided data.
- If not, a local keyword-routed heuristic engine (`askAssistant`'s
  fallback branch) answers using the identical grounding data — same
  numbers, less fluent prose. The UI labels which mode answered.

This means the assistant is never answering from nothing: both modes are
grounded in the same computed statistics.

## API key rotation

Each environment's API key can be regenerated from Settings
(`regenerateApiKeyAction` in `src/app/actions/environments.ts`,
admin/owner only). The old key is invalidated immediately — any
consuming app's SDK still using it will fail flag evaluation calls until
updated with the new key. Regeneration is audited (last 4 characters of
old/new key only, never the full secret, since audit entries can be
exported to CSV).

## Security

- Session cookies: HMAC-SHA256 signed (`src/lib/auth.ts`), httpOnly,
  `secure` in production, 14-day expiry.
- Passwords: `scrypt` (Node's built-in, no external dependency), random
  16-byte salt per user, `timingSafeEqual` comparison.
- All mutation inputs validated with Zod (`src/lib/validation.ts`) before
  touching the data layer.
- RBAC enforced per-action (`requireRole` in `src/lib/context.ts`) — e.g.
  archiving a flag or deciding an approval requires `admin`+.
- Security headers set globally in `next.config.js` (X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Rate limiting on the one unauthenticated-by-session, highest-traffic
  endpoint (`/api/evaluate`).
- Password hashing, session token signing/verification (including
  tamper and expiry rejection), and role-hierarchy checks are covered by
  `src/lib/auth.test.ts`.

## Known limitations of the standalone mode

- The local JSON store uses an in-process write queue, not real
  transactions — correct for a single dev/demo instance, not for
  multiple concurrent server instances. Real concurrency safety comes
  from moving to Supabase Postgres.
- The in-memory cache/rate-limiter reset on server restart and don't
  share state across instances — fine for one instance, not for a
  horizontally-scaled deployment. Both have Upstash-shaped interfaces
  specifically so this is a body-only swap (`src/lib/cache.ts`,
  `src/lib/ratelimit.ts`).
- No emailed invites yet — adding a member requires them to already have
  an account (see `src/app/actions/members.ts`).
- Pinned to Next.js 14.2.x (latest patch on that line) rather than 16 —
  this codebase uses synchronous `cookies()`/`headers()` throughout, which
  Next 15+ made async. A handful of `npm audit` findings on this version
  (Image Optimization DoS, WebSocket-upgrade SSRF, RSC cache poisoning,
  i18n middleware bypass) are in subsystems this app doesn't use
  (no `next/image`, no WebSocket upgrades, no i18n routing) — re-evaluate
  before any real internet-facing deployment.

## Free-tier ceilings to watch when connecting real services
- **Supabase free tier:** 500MB database, paused after 1 week of
  inactivity on the free project tier.
- **Upstash free tier:** 10,000 commands/day on the free Redis database.
- **Groq free tier:** rate-limited requests/tokens per minute (varies by
  model; check Groq's current published limits before relying on it for
  production traffic volume).
- **Vercel free tier:** 100GB bandwidth/month, function execution limits.

None of these are approached by local/demo use; they matter once real
traffic is connected in V1.
