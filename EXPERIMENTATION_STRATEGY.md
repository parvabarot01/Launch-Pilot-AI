# Experimentation Strategy

## Statistical approach
- **Test:** two-proportion z-test comparing each treatment variant against
  a designated control, on conversion rate (conversions / exposures).
- **Significance threshold:** alpha = 0.05, two-tailed.
- **Confidence intervals:** Wald 95% CI on each variant's own conversion
  rate (`rate ± 1.96 × SE`).
- **Sample-size-adequacy:** required N per arm computed from the observed
  baseline rate, targeting 80% power to detect a 5-percentage-point
  absolute lift at alpha=0.05 (standard two-proportion power formula). An
  experiment's verdict is never "ship" until both arms clear this bar —
  see `computeSignificance` in `src/lib/stats.ts`.
- **Lift reporting:** relative lift vs. control, `(treatment - control) / control`.

## Why a two-proportion z-test and not something fancier
It's the right tool for the common case this product optimizes for:
binary outcome metrics (did they convert, yes/no) with a clear control
and one or more treatments. Sequential testing, multi-armed bandits, and
CUPED-style variance reduction are real improvements but add complexity
and failure modes that aren't worth it before the simpler test is fully
trusted. Tracked in `ROADMAP.md` V2.

## Experiment lifecycle
`draft` → `running` → `completed` | `archived`

- **draft**: variants and success metric defined, no traffic yet.
- **running**: events (exposure/conversion/revenue/custom) are being
  recorded; the significance engine recomputes on every page view.
- **completed**: a ship/no-ship decision was made.
- **archived**: abandoned without a decision (tracked as a rigor-negative
  signal — see `KPI_FRAMEWORK.md`).

## Verdicts surfaced to users
- `insufficient_data` — at least one arm hasn't cleared the required
  sample size yet. Recommendation: keep running.
- `ship_winner` — a treatment beat control with p < 0.05 and adequate
  sample size. Recommendation: ship it.
- `no_effect` — adequate data, no significant winner. Recommendation:
  conclude as a null result rather than extending indefinitely.
- `keep_running` — not enough events recorded yet to say anything.

## Guardrails against p-hacking
- The verdict logic requires sample-size adequacy *before* significance is
  treated as actionable — a variant can show p < 0.05 on tiny samples and
  will still be flagged `insufficient_data`.
- Rollout increases derived from an experiment still pass through the
  governance approval threshold in `src/lib/governance.ts` if the jump is
  large enough; a significant result doesn't bypass governance for a
  100%-in-production jump.
