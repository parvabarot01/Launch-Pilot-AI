# LaunchPilot

Feature flags, experimentation, and release governance in one platform — so
shipping fast and shipping safely aren't in tension.

LaunchPilot combines feature flag management, gradual rollouts, A/B testing
with real statistical rigor, and an AI-assisted decision layer for release
governance. It exists so teams don't have to stitch together a flag tool, a
separate experimentation product, and a manual stats sanity-check just to
ship one change with confidence.

## What's in here

- **Feature flags** — create, target by user segment, roll out by
  percentage, and kill-switch instantly. Every change is audited and
  reversible.
- **Experiments** — turn a flag into an A/B test with variants and a
  success metric. Confidence intervals, p-values, and sample-size-adequacy
  checks are computed for real.
- **AI Decision Assistant** — ask which experiment to prioritize, why one
  failed, or whether a rollout increase is safe. Answered from your org's
  actual data.
- **Release governance** — rollout increases past a risk threshold require
  admin/owner approval; every flag state can be rolled back in one click.
- **Executive rollup** — a risk-scored view of everything currently
  rolling out.

## Getting started

```bash
npm install
npm run seed   # optional: creates a demo org with sample flags/experiments
npm run dev
npm test       # runs the core-logic test suite (stats, evaluation, governance)
```

Then visit `http://localhost:3000`. If you ran the seed script, log in with
`demo@launchpilot.dev` / `demo12345`. Otherwise, sign up for a fresh account
— that creates your organization and its three environments automatically.

## Running standalone vs. connecting real services

LaunchPilot runs completely standalone out of the box: a local file-backed
store stands in for the database, an in-memory cache/rate-limiter stand in
for Redis, and a rule-based statistics engine stands in for the AI model.
Nothing calls out to a third party unless you configure it to.

To connect real infrastructure later, copy `.env.example` to `.env.local`
and fill in the values for whichever services you want to swap in — see
`ARCHITECTURE.md` → "Service Adapters" for exactly where each one plugs in.
Every one is optional and independent of the others.

## Client SDK

A dependency-free JS snippet lives at `public/sdk/launchpilot.js` for
evaluating flags from any consuming app. See Settings → Environments in the
app for a copy-paste snippet with your API key filled in.

## Documentation

- [`PRD.md`](PRD.md) — product requirements
- [`PERSONAS.md`](PERSONAS.md) — who this is for
- [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) — vs. LaunchDarkly, Optimizely, Statsig, Split.io
- [`ROADMAP.md`](ROADMAP.md) — MVP → V1 → V2
- [`KPI_FRAMEWORK.md`](KPI_FRAMEWORK.md) / [`NORTH_STAR_METRIC.md`](NORTH_STAR_METRIC.md)
- [`EXPERIMENTATION_STRATEGY.md`](EXPERIMENTATION_STRATEGY.md)
- [`GTM_STRATEGY.md`](GTM_STRATEGY.md) / [`PRICING_STRATEGY.md`](PRICING_STRATEGY.md)
- [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) / [`EXECUTIVE_PRESENTATION.md`](EXECUTIVE_PRESENTATION.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — schema, API surface, flag-evaluation design
- [`BACKLOG.md`](BACKLOG.md) — living backlog
