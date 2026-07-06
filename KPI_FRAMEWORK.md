# KPI Framework

## Activation
- Time from signup to first flag created
- Time from signup to first experiment reaching a verdict
  (ship_winner/no_effect/insufficient_data)
- % of orgs that create at least one flag in their first session

## Engagement
- Flags actively evaluated per org per week (evaluation endpoint traffic)
- Experiments moved from `draft` → `running` per org per month
- AI assistant questions asked per org per week

## Trust / governance health
- % of rollout increases that went through the approval workflow vs. were
  small enough to apply directly
- Median time-to-decision on pending approvals
- Rollbacks performed per month (a proxy for how often gradual rollout +
  kill switch caught something before it became an incident)

## Experimentation rigor
- % of concluded experiments that reached "sample size adequate" before a
  ship decision was made (a rigor metric — are teams shipping on
  underpowered data or waiting for real signal)
- Distribution of experiment lift sizes shipped

## Guardrail metrics (must not regress while optimizing the above)
- Flag-evaluation endpoint p95 latency
- Flag-evaluation endpoint error rate
- Rate-limit rejection rate on the evaluation endpoint

See `NORTH_STAR_METRIC.md` for the single metric this framework rolls up to.
