# LaunchPilot AI — Enterprise Experimentation Platform
### Build Prompt for Claude Code (VS Code Extension)

## How to use this file
Paste this entire file as your first message to Claude Code in this repo. First instructions to it: "Read this plan, create `CLAUDE.md` capturing it, then create `BACKLOG.md` breaking Sprint 1 into individual features, then start implementing feature by feature, committing and pushing after each one."

---

## 0. Non-Negotiable Rules (read first, apply to every action)

1. **No mention of Claude, Anthropic, "AI-generated," "AI assistant," or any AI-authorship anywhere user-facing or version-controlled as narrative content.** No exceptions in: git commit messages, README.md, LICENSE, package.json fields, code comments, PR descriptions, PROGRESS_LOG.md, or PM documents. Everything reads as written by a solo founder/PM/engineer (me).
2. `CLAUDE.md` is an internal tool-config file only — fine in the repo root, never referenced from README, commits, or product docs.
2a. **`CLAUDE.md` and `PROGRESS_LOG.md` must never reach GitHub.** Before the first commit, create a `.gitignore` (if one doesn't already exist) and add `CLAUDE.md` and `PROGRESS_LOG.md` to it, along with the standard Next.js/Node entries (`node_modules`, `.env*`, `.next`, `.vercel`, `*.log`). Verify with `git status` that both show as untracked/ignored before making the first commit. If either file was ever committed before this rule was applied, remove it from git history (`git rm --cached CLAUDE.md PROGRESS_LOG.md`) as part of the very first commit, not a later cleanup pass. `PROGRESS_LOG.md` is my private build log, not a public artifact — because it stays local-only, it should be written in full technical detail (see Section 6) rather than polished for outside readers.
3. Set git author identity to my own name/GitHub handle before the first commit; ask me if not already configured.
4. Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`) naming the feature only.
5. Push after every completed, working feature — not every file save.
6. Zero-dollar constraint: every service must have a genuinely free tier this project stays within. No paid APIs, no paid hosting, no paid add-ons. Note any real free-tier ceiling in ARCHITECTURE.md rather than exceeding it silently.

---

## 1. Product Vision & Business Case

LaunchPilot AI is an enterprise feature-flag, experimentation, and release-governance platform. It combines feature flags, gradual rollouts, A/B testing, and statistically-grounded AI recommendations into one product, so teams can ship faster while minimizing risk.

**Problem it solves:** teams typically stitch together separate feature-flag tools, analytics tools, and dashboards to run one experiment safely. LaunchPilot unifies flag management, experiment tracking, and release governance, with an AI layer that helps interpret whether results are meaningful and what to do next.

**Positioning:** a zero-cost, AI-native alternative to running LaunchDarkly + a separate A/B testing tool + a manual stats sanity-check.

---

## 2. Target Users & Personas
Cover in `PERSONAS.md`, Sprint 1, at minimum:
- Product Manager / Growth PM — needs to know which variant to ship, not raw p-values
- Engineering Manager / Software Engineer — needs safe, reversible flag control (kill switches, gradual rollout)
- Data Scientist / Product Analyst — needs correct statistical significance reporting they can trust
- Executive — needs a risk-scored view of what's rolling out and why

---

## 3. Tech Stack (all free tier)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Free, deploys free on Vercel |
| Hosting | Vercel (free tier) | Zero cost CI/CD |
| Database + Auth | Supabase (free tier: Postgres, Auth, Storage, RLS) | Multi-tenancy via RLS |
| Flag evaluation cache | Upstash Redis (free tier) | Fast flag lookups without a paid edge-config product |
| Statistics | `simple-statistics` (free npm package) for significance testing (z-test/t-test, confidence intervals) | Avoids needing a paid stats/experimentation vendor |
| AI (recommendations, risk scoring, "why did this fail" analysis) | Groq API (free tier, Llama 3.3 70B) | Free, fast |
| Client SDK | Lightweight custom JS SDK (own code, published as an npm package or just a script snippet) | Avoids depending on a paid flag SDK vendor |

Security playbook applies throughout: Supabase RLS on every table, Zod validation on every route, rate-limiting via Upstash on the flag-evaluation endpoint (this is the highest-traffic endpoint in this product), full security headers, secrets in env vars only, audit log on every flag change and rollout percentage change (this is a governance-sensitive feature).

---

## 4. Required Repo Documents (create in Sprint 1, update every sprint)

- `README.md`, `PROJECT_PLAN.md`
- `PRD.md`, `PERSONAS.md`, `COMPETITIVE_ANALYSIS.md` (vs. LaunchDarkly, Optimizely, Statsig, Split.io)
- `ROADMAP.md` (MVP → V1 → V2)
- `KPI_FRAMEWORK.md` + `NORTH_STAR_METRIC.md`
- `EXPERIMENTATION_STRATEGY.md`
- `GTM_STRATEGY.md`, `PRICING_STRATEGY.md`
- `EXECUTIVE_SUMMARY.md` (updated per sprint)
- `BACKLOG.md` (living, sprint-tagged)
- `PROGRESS_LOG.md` — **local-only, gitignored** — append-only, detailed log of everything done, one entry per sprint
- `ARCHITECTURE.md` (DB schema, API spec, flag-evaluation design)

---

## 5. Sprint Plan (3 Sprints)

### Sprint 1 — Foundation & Feature Flag Management
**Goal:** a working multi-tenant system where flags can actually be created, targeted, and safely toggled.
- Auth, organizations, teams, RBAC, audit log (with change history on every flag mutation — this matters for release governance)
- Core schema: organizations, users, environments, feature_flags, flag_rules
- Flag CRUD with environment management (dev/staging/prod), targeted releases by user segment, gradual rollout percentage control, kill switch
- Lightweight client SDK (script snippet) for flag evaluation in a consuming app
- CI/CD to Vercel
- PM docs: `PRD.md` (v1), `PERSONAS.md`, `COMPETITIVE_ANALYSIS.md`, `KPI_FRAMEWORK.md` (draft), `ROADMAP.md`
- **Sprint 1 done when:** a user can create a flag, target a percentage rollout or user segment, flip a kill switch, and see the change reflected via the SDK with an audit trail.

### Sprint 2 — Experiment Management & Analytics
**Goal:** flags become experiments with real statistical rigor behind them.
- Experiment schema: hypothesis, variants, success metrics, experiment lifecycle states
- Event tracking tied to experiments (conversion, retention, revenue-proxy metrics)
- Statistical significance engine (`simple-statistics`): confidence intervals, p-values, sample-size-adequacy check
- Experiment dashboard: funnel performance, cohort comparison per variant
- PM docs: `EXPERIMENTATION_STRATEGY.md`, `EXECUTIVE_SUMMARY.md` update, `ARCHITECTURE.md` (full schema + API write-up)
- **Sprint 2 done when:** a user can define an experiment with variants and a success metric, see live conversion/retention numbers per variant, and get a correctly computed significance result.

### Sprint 3 — AI Decision Assistant, Release Governance, Executive Layer, Launch Polish
**Goal:** the AI judgment layer and the release-safety layer that make this an enterprise product, not a toy.
- AI Decision Assistant: answers "which experiment should we prioritize next," "why did this experiment fail," "is this lift statistically meaningful," "should we increase rollout %" — grounded in the org's real experiment data
- Release governance: approval workflow for rollout increases past a threshold, rollback automation (one-click revert to prior flag state), risk scoring per flag/experiment, compliance/change-log report
- Executive Dashboard: active experiments, recent rollouts, risk-scored release calendar
- Hardening pass: RLS audit, rate-limit audit on flag-evaluation endpoint specifically (this is the load-bearing path), error tracking, core-flow test coverage
- PM docs: `GTM_STRATEGY.md`, `PRICING_STRATEGY.md`, final `EXECUTIVE_SUMMARY.md`, one-page Executive Presentation doc, `NORTH_STAR_METRIC.md` finalized
- **Sprint 3 done when:** the full loop (flag/experiment → data → AI-grounded recommendation → governed rollout decision → executive rollup) is demoable end to end and deployed.

---

## 6. Sprint Workflow (what to actually do, in order)

1. Read this file fully. Create `CLAUDE.md` for your own reference.
2. Create `BACKLOG.md` with Sprint 1's features as individually shippable tasks, tagged `[Sprint 1]` etc.
3. Implement one item at a time: code it, test it, commit (conventional commit message), push, check it off in `BACKLOG.md`.
4. Add PM docs as you go, not batched at the end.
5. At sprint end: summary in chat **and** appended to `PROGRESS_LOG.md`, then update `ROADMAP.md`.
6. Pause for review at the end of each sprint unless told to continue.

### End-of-sprint summary format
The version posted in chat can stay brief. The version appended to `PROGRESS_LOG.md` should be the full detailed one below — since this file is gitignored and private, there's no reason to compress it.

```
## Sprint N Summary — [date range]

**Features shipped (in build order):**
- Feature name — what it does, why it was built this way, commit hash, files touched
- Feature name — ...

**Technical decisions & tradeoffs:**
- Decision made, alternatives considered, why this one was chosen

**Database/schema changes:**
- Tables/columns added or modified, migrations run

**PM docs added/updated:**
- Doc name — summary of what changed and why

**Deviations from the plan:**
- Anything skipped, reordered, or scoped differently than this project plan specified, and why

**Bugs/issues hit and how resolved:**
- ...

**Known gaps / deferred items:**
- Anything left unfinished or intentionally punted to a later sprint

**Environment/config changes:**
- New env vars, new free-tier services connected, API keys set up (names only, never values)

**Next sprint starts with:**
- First 2-3 planned tasks
```

---

## 7. Scope Discipline

Roughly 6–10 shippable features per sprint. Don't pre-decompose into micro-tasks; don't bundle the whole sprint theme into one giant commit either.
