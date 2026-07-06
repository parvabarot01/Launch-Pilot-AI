# LaunchPilot — One-Page Executive Presentation

**The pitch, in one sentence:** LaunchPilot unifies feature flags, A/B
testing, and release governance into one product, so teams ship faster
without trading away safety.

## The problem
Teams typically run three disconnected systems to ship one change
safely: a feature-flag tool, a separate experimentation/analytics tool,
and a manual process — a spreadsheet, a Slack thread, a gut call — to
decide whether a result is real and whether a rollout is safe. Every
handoff between those systems is where risk and slowdown creep in.

## The solution
One platform, one data model, one audit trail:

**Flag → Experiment → AI-grounded recommendation → Governed rollout → Executive rollup**

- **Flags**: targeting, gradual rollout, instant kill switch, one-click rollback
- **Experiments**: real two-proportion z-test significance — confidence
  intervals, p-values, sample-size-adequacy gating, not a guess
- **AI Decision Assistant**: answers grounded in the org's actual computed
  data — which experiment to prioritize, why one showed no effect,
  whether a lift is trustworthy
- **Governance**: rollout increases past a risk threshold require
  admin/owner approval, with a computed multi-factor risk score
- **Executive rollup**: a risk-scored view of everything currently live

## Why now / why this wins
| | Feature flags | A/B testing w/ real stats | Governance as standard, not enterprise add-on | AI-grounded recs |
|---|---|---|---|---|
| LaunchDarkly | ✓ | add-on | enterprise-only | — |
| Optimizely | partial | ✓ | — | — |
| Statsig | ✓ | ✓ | — | — |
| **LaunchPilot** | ✓ | ✓ | ✓ | ✓ |

Full detail: `COMPETITIVE_ANALYSIS.md`.

## Proof, not projection
This isn't a slide deck — it's a working product today:
- Full flag lifecycle (create → target → roll out → govern → roll back), audited end to end
- A statistically correct significance engine, unit-tested against known scenarios
- A governance layer that actually blocks large rollout increases pending approval — not a UI warning
- 44 automated tests covering the statistical, evaluation, and security-critical logic
- Runs at zero infrastructure cost today; every backing service has a documented, additive path to production scale

## The ask
Nothing, yet — this is self-funded, zero-dollar infrastructure by design
(see `PRICING_STRATEGY.md`). The next milestone is connecting production
infrastructure (Supabase, Upstash, Groq, Vercel) and onboarding the first
real team.

## North star
**Weekly Governed Rollouts** — rollout changes backed by either a
significant experiment result or an explicit governance approval. See
`NORTH_STAR_METRIC.md`.
