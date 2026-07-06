# North Star Metric

## Weekly Governed Rollouts

**Definition:** the number of rollout-percentage changes per week, across
all orgs, that were backed by either (a) an experiment that reached
statistical significance, or (b) an explicit governance approval.

This is the one number that captures the actual promise of the product:
teams shipping changes *and* doing so with real evidence or a deliberate
sign-off behind the decision — not flag changes in general (which could
just mean "a lot of guessing"), and not experiments run (which could just
mean "a lot of tests nobody acts on").

## Why this metric and not a simpler one

- Raw flag count or MAU rewards adoption without rewarding the safety
  behavior the product exists to encourage.
- Raw experiment count rewards running tests, not using their results.
- Weekly Governed Rollouts only goes up when the full loop the product is
  built around — data or approval driving a real rollout decision —
  actually happens.

## Inputs that move it
- More experiments reaching `sampleSizeAdequate: true` before ship
  decisions (see `analyzeExperiment` in `src/lib/ai.ts`)
- More rollout increases routed through and cleared by the approval
  workflow rather than staying stuck at a small percentage indefinitely
- Fewer abandoned/archived experiments that never reached a verdict
