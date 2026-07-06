# Roadmap

## MVP (shipped)
- Multi-tenant orgs, RBAC, three environments per org
- Feature flag CRUD, targeting rules, percentage rollout, kill switch,
  rollback, audit log
- Experiments: variants, event tracking, two-proportion z-test significance
  engine, sample-size-adequacy check
- AI Decision Assistant (heuristic engine, upgradeable to Groq/Llama)
- Release governance: approval workflow + risk scoring + rollback
- Executive dashboard
- Dependency-free client SDK + rate-limited/cached evaluation endpoint
- Local file-backed store, in-memory cache/rate-limiter — runs standalone
  with zero external services, with clean swap points for real ones

## V1 — connect real infrastructure, harden for actual traffic
- Swap local JSON store for Supabase Postgres + RLS (schema already
  modeled 1:1 in `src/lib/types.ts`)
- Swap in-memory cache/rate-limiter for Upstash Redis
- Connect Groq for the AI assistant in production
- Emailed invites (replacing direct-add-by-email)
- CI/CD to Vercel, error tracking
- UI/rendered-page test coverage (current suite covers core logic *and*
  Server Actions — 95 tests — but not the React components/pages
  themselves; would need a browser-based test runner)
- Unit tests for the `cache.ts`/`ratelimit.ts` in-memory adapters
  specifically (covered manually via live browser testing, not yet
  automated)
- Emailed-invite flow (invite tokens, accept-invite page, expiry) —
  needs both an email provider connection and the invite-flow logic
  itself; currently members are added directly by email to an existing
  account
- Multi-instance-safe evaluation path (current in-memory cache/rate-limit
  only works correctly on a single instance)

## V2 — deeper experimentation & governance
- Sequential testing / early-stopping guardrails
- Multi-armed bandit allocation as an alternative to fixed-split A/B
- Webhooks (flag changed, experiment concluded, approval requested)
- SSO/SAML for enterprise orgs
- Mobile SDKs (iOS/Android) alongside the JS SDK
- Scheduled rollouts (e.g. "increase to 50% at 9am Tuesday")
- Segment builder UI (targeting rules as saved, reusable segments)
