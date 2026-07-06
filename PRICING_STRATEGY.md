# Pricing Strategy

## Current stage: free, self-hosted
LaunchPilot runs entirely on infrastructure with a genuine free tier
(Vercel + Supabase + Upstash + Groq — see `ARCHITECTURE.md` for the exact
free-tier ceilings). There is no billing in the product today. This is a
deliberate MVP choice, not a placeholder oversight: proving the product
loop (flag → experiment → governance → executive rollup) matters more
right now than monetization mechanics.

## Future pricing shape (post-MVP, not implemented)
When monetization is introduced, the natural axis is **usage that costs
the operator money**, not seats — consistent with the zero-dollar
philosophy the product is built on:

| Tier | Fit | Would include |
|---|---|---|
| Free | Small teams, self-hosted or shared free-tier instance | Everything in this MVP, free-tier service ceilings apply |
| Team | Teams exceeding free-tier ceilings (flag-eval volume, event volume) | Same features, paid-tier backing services, higher ceilings |
| Enterprise | Orgs needing SSO, audit export, dedicated support | Team tier + SSO/SAML, compliance reporting, SLA |

## Why not seat-based pricing
Feature-flag and experimentation tools are used by the whole team
(PMs, engineers, analysts, executives) but the cost driver is
infrastructure load (flag evaluations, event volume), not headcount.
Charging per seat would penalize exactly the cross-functional adoption
the product depends on to be useful (see `PERSONAS.md`).

## Why this isn't built yet
No payment processor is free-tier — billing infrastructure is explicitly
out of scope until there's a real user base to monetize. Revisit in V1/V2
per `ROADMAP.md`.
