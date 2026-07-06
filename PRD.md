# Product Requirements Document — LaunchPilot

**Status:** v1 · MVP scope described below is fully implemented.

## 1. Problem

Teams that want to ship safely typically run three disconnected systems:

1. A feature-flag tool (targeting, rollout %, kill switches)
2. A separate A/B testing / analytics tool (variant tracking, significance)
3. A manual process — a spreadsheet, a Slack thread, a gut call — to decide
   whether a result is real and what to do about a risky rollout

Every handoff between those systems is where slowdowns and mistakes creep
in: a flag gets flipped to 100% without anyone checking the experiment
attached to it was actually significant; a rollback takes an engineer
digging through deploy history instead of one click.

## 2. Solution

One platform where a flag, its rollout, its attached experiment, and the
governance decision to increase its rollout are all the same object graph,
audited end to end, with an AI layer that reads the org's own data to
answer "is this safe to ship."

## 3. Scope (MVP — implemented)

### Feature flag management
- Create/edit/archive flags per organization
- Per-environment (dev/staging/production) state: enabled, kill switch,
  rollout percentage, targeting rules
- Targeting rules: attribute/operator/value matching (equals, not_equals,
  contains, in, gt, lt)
- Deterministic percentage rollout (stable per-user bucketing, not random
  per request)
- One-click rollback to any of the last 10 recorded states per flag/environment
- Full audit trail on every mutation

### Experimentation
- Attach an experiment (hypothesis, success metric, N variants with
  allocation %) to a flag or run standalone
- Event tracking: exposure / conversion / revenue / custom
- Two-proportion z-test significance engine: p-values, 95% confidence
  intervals, lift vs. control, sample-size-adequacy check (power analysis
  at alpha=0.05, 80% power, 5-point minimum detectable effect)
- Experiment lifecycle: draft → running → completed/archived

### AI Decision Assistant
- Free-text Q&A grounded in the org's real flag/experiment data for the
  active environment
- Answers: which experiment to prioritize, why an experiment showed no
  effect, whether a lift is statistically meaningful, whether a rollout
  increase looks safe
- Works fully offline via a rule-based heuristics engine; upgrades to a
  hosted LLM (Groq/Llama 3.3 70B) automatically when `GROQ_API_KEY` is set,
  using the identical grounding data either way

### Release governance
- Rollout increases of 50+ percentage points, or reaching 100%, require
  admin/owner approval before taking effect
- Per-request risk scoring (0-100) from rollout jump size, environment,
  whether an experiment backs the decision, and recent rollback history
- Approve/reject workflow with full audit trail
- One-click rollback, independent of the approval workflow, for any past
  state

### Executive rollup
- Active flags / running experiments / pending approvals / ready-to-ship
  winners at a glance
- Risk-scored release calendar across all active rollouts

### Platform
- Multi-tenant orgs with role-based access (owner/admin/member/viewer)
- Three environments per org (development/staging/production), each with
  its own API key
- Dependency-free client SDK for flag evaluation from any consuming app
- Rate-limited, cached flag-evaluation endpoint (the highest-traffic path)

## 4. Out of scope for MVP (see ROADMAP.md)
- Emailed invite links (adds are direct, by email, to an existing account)
- SSO / SAML
- Multi-armed bandit allocation
- Webhooks / outbound integrations
- Mobile SDKs

## 5. Success criteria
See `KPI_FRAMEWORK.md` and `NORTH_STAR_METRIC.md`.
