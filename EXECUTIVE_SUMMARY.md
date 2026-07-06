# Executive Summary

**LaunchPilot** is a feature-flag, experimentation, and release-governance
platform that lets teams ship faster without trading away safety. It
replaces the usual stack of a flag tool + a separate A/B testing tool + a
manual "is this significant" judgment call with one governed workflow.

## Where things stand
The full MVP loop is built and demoable end to end: create a flag, target
it, roll it out gradually, attach an experiment, get a statistically
grounded verdict, ask the AI assistant what to do next, and — if the
rollout increase is large enough — have it route through an approval
workflow with a computed risk score before it takes effect. Every change
is audited and reversible.

The product runs entirely standalone today: a local file-backed store,
in-memory cache, and a rule-based statistics/heuristics engine stand in
for the real-infrastructure versions (Supabase, Upstash, Groq) so it can
be evaluated and demoed with zero external accounts. Every swap point is
documented in `ARCHITECTURE.md` and gated by a single environment
variable, so connecting real infrastructure is additive, not a rewrite.

## What's proven
- The statistical engine (two-proportion z-test, confidence intervals,
  sample-size-adequacy gating) is implemented correctly, not approximated
  — see `EXPERIMENTATION_STRATEGY.md`.
- Governance isn't cosmetic: rollout increases past a defined threshold
  are actually blocked pending admin/owner approval, with a real
  multi-factor risk score, not just a UI warning.
- The AI assistant is grounded in the org's real computed numbers in both
  modes (heuristic fallback and, when connected, Groq/Llama) — it can't
  answer from data that isn't there.

## What's next
See `ROADMAP.md` V1: connect real backing services (Supabase, Upstash,
Groq) for production use, add automated test coverage, and move from
direct-add-by-email to real invite emails.
