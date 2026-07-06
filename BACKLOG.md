# Backlog

Originally planned as three sprints; built as one combined pass per
direct instruction. Items below are tagged with their original sprint
theme for traceability, all shipped in this pass unless noted.

## Sprint 1 theme — Foundation & Feature Flag Management
- [x] Auth (signup/login/logout/session)
- [x] Organizations, environments (dev/staging/prod), RBAC (owner/admin/member/viewer)
- [x] Audit log with change history on every flag mutation
- [x] Core schema: organizations, users, environments, feature_flags, flag_rules
- [x] Flag CRUD with environment management
- [x] Targeted releases by user segment (targeting rules)
- [x] Gradual rollout percentage control
- [x] Kill switch
- [x] Lightweight client SDK for flag evaluation
- [x] PM docs: PRD, PERSONAS, COMPETITIVE_ANALYSIS, KPI_FRAMEWORK, ROADMAP
- [ ] CI/CD to Vercel — deferred: requires connecting a Vercel account, which is an online-service connection step left for manual setup (see README "Running standalone vs. connecting real services")

## Sprint 2 theme — Experiment Management & Analytics
- [x] Experiment schema: hypothesis, variants, success metrics, lifecycle states
- [x] Event tracking tied to experiments (exposure/conversion/revenue/custom)
- [x] Statistical significance engine: confidence intervals, p-values, sample-size-adequacy check
- [x] Experiment dashboard: per-variant performance comparison
- [x] PM docs: EXPERIMENTATION_STRATEGY, ARCHITECTURE (full schema + design)
- [x] EXECUTIVE_SUMMARY update

## Sprint 3 theme — AI Decision Assistant, Release Governance, Executive Layer
- [x] AI Decision Assistant grounded in real org data (heuristic engine + optional Groq upgrade)
- [x] Release governance: approval workflow for rollout increases past a threshold
- [x] Rollback automation (one-click revert to prior flag state)
- [x] Risk scoring per flag rollout
- [x] Executive Dashboard: active experiments, recent rollouts, risk-scored release calendar
- [x] PM docs: GTM_STRATEGY, PRICING_STRATEGY, final EXECUTIVE_SUMMARY, NORTH_STAR_METRIC
- [x] Compliance/change-log report — CSV export of the audit log (`/api/audit-log/export`), filterable by action and entity type, same filters exposed as dropdowns on the Audit Log page
- [x] Automated test coverage on core logic — significance engine, flag evaluation (kill switch, targeting rules, deterministic bucketing), governance risk scoring, and auth/session security (password hashing, token sign/verify/tamper/expiry, role hierarchy). `npm test` (Node's built-in test runner via `tsx`, no new test framework dependency). 35 tests. UI/integration flows still untested — see ROADMAP.md V1.
- [x] API key rotation — regenerate an environment's key from Settings (admin/owner only), old key invalidated immediately, rotation audited
- [x] Login brute-force protection — 5 failed attempts per email locks that email out for 15 minutes (`src/lib/loginThrottle.ts`)
- [x] Fixed a critical leak: every environment's live API key was being sent to every signed-in org member's browser on every dashboard page (not just Settings), via the dashboard layout's environment switcher passing full `Environment` records to a client component. Also added role-gating so only member+ (not viewer) ever receives the real key at all. See ARCHITECTURE.md "Server/Client component boundary."
- [ ] Error tracking — deferred, requires connecting a third-party service

## Front page
- [x] Public landing page explaining the product, features, and personas

## Deferred to V1 (see ROADMAP.md)
- [ ] Connect Supabase, Upstash, Groq for real (currently local/in-memory/heuristic by design)
- [ ] Emailed invites (currently direct-add-by-email to an existing account)
- [ ] Multi-instance-safe cache/rate-limit (currently in-memory, single-instance)
