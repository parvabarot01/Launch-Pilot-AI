# Go-to-Market Strategy

## Wedge
Teams currently paying for (or outgrowing the free tier of) a
feature-flag tool *and* separately cobbling together experiment tracking.
The pitch: replace both, plus the manual "is this significant" step, with
one product that also adds governance most tools charge enterprise
pricing for.

## Initial target segment
Small-to-mid-size product/engineering teams (5-50 engineers) who:
- Already practice some form of feature flagging (even homegrown/config-based)
- Have been burned at least once by a rollout that should have been staged
  or an experiment result nobody was confident in
- Are price-sensitive enough that a zero-cost, self-hostable option beats
  a per-seat SaaS tool

## Distribution
- **Bottom-up, engineering-led:** the client SDK and the standalone/local
  mode (no signup, no external services required to try it) make the
  time-to-first-value near zero — clone, `npm run seed`, `npm run dev`.
  This mirrors how developer tools like early Statsig/PostHog grew.
- **Content:** write-ups on the specific mechanics that differentiate
  this product — the significance engine's sample-size-adequacy gate, the
  governance risk-scoring formula — aimed at engineers who'll recognize a
  real implementation vs. marketing copy.
- **Open build-in-public artifacts:** `ARCHITECTURE.md` and
  `EXPERIMENTATION_STRATEGY.md` are written to be credible technical
  documentation on their own, not just internal notes.

## Expansion motion
Land with flags (lowest-friction adoption), expand to experiments once a
team is already flagging changes, expand to governance once more than one
person is allowed to touch production flags.

## Not doing (for now)
- Outbound sales — this is a product-led, technical-buyer motion at this
  stage, not an enterprise sales motion.
- Paid acquisition — zero marketing budget at this stage; see
  `PRICING_STRATEGY.md` for the zero-dollar constraint this mirrors.
