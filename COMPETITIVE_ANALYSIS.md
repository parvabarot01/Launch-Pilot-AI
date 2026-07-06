# Competitive Analysis

| | LaunchDarkly | Optimizely | Statsig | Split.io | **LaunchPilot** |
|---|---|---|---|---|---|
| Feature flags | Yes, best-in-class | Limited | Yes | Yes | Yes |
| Gradual rollout / kill switch | Yes | Partial | Yes | Yes | Yes |
| A/B testing w/ significance | Add-on | Core strength | Yes | Yes | Yes (two-proportion z-test, CI, sample-size check) |
| Release governance / approvals | Enterprise tier only | No | No | Limited | Yes, built in |
| AI-grounded recommendations | No | No | No | No | Yes |
| Executive risk rollup | No | No | No | No | Yes |
| Pricing floor | Paid (free tier capped at 1k MAU) | Paid, sales-led | Generous free tier | Paid | **$0** on free-tier infra you control |

## Positioning

LaunchPilot is not trying to out-scale LaunchDarkly's edge network or
out-analyze Optimizely's stats team. The wedge is **unification at zero
cost**: one product, one data model, one audit trail, covering the flag →
experiment → governance → executive loop that competitors either split
across products or gate behind enterprise pricing.

## Where competitors win today

- **LaunchDarkly**: global edge flag evaluation at massive scale; mature
  SDKs for every major language/platform. LaunchPilot's evaluation path is
  a single Next.js deployment, not a global edge network — fine at
  small-to-mid scale, a real gap at LaunchDarkly's scale.
- **Optimizely**: purpose-built experimentation UI, deeper stats
  (sequential testing, multi-armed bandits) and a longer track record with
  enterprise compliance needs.
- **Statsig**: strong generous free tier and a similar "flags +
  experiments in one tool" pitch — the closest direct competitor in spirit.
- **Split.io**: enterprise-focused governance and RBAC maturity beyond
  what a v1 product like this has.

## Where LaunchPilot's approach is differentiated

- Governance (approval workflow, risk scoring, rollback) as a first-class,
  always-on feature rather than an enterprise-tier add-on.
- An AI layer that answers with the org's actual computed statistics
  instead of a generic explanation — and degrades gracefully to a
  deterministic rule-based engine with zero external dependency when no
  model API key is configured.
- Every service in the stack has a genuinely free tier, documented
  explicitly rather than discovered when a bill arrives.
