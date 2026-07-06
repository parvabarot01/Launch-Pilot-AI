# Personas

## Priya — Product / Growth PM
**Needs:** to know which variant to ship, not raw p-values. Runs 2-3
experiments at a time across onboarding and checkout.
**Uses LaunchPilot to:** create experiments with a clear hypothesis and
success metric, check the experiment detail page for a plain-language
verdict ("ship the winner" / "needs more data" / "no effect"), and ask the
AI assistant which of her running experiments to prioritize next.
**Frustration LaunchPilot removes:** previously had to export data to a
spreadsheet and either trust a data scientist's read or eyeball it herself.

## Sam — Engineering Manager / Senior Engineer
**Needs:** safe, reversible flag control. Owns the on-call rotation and
has been paged before for a rollout that should have been staged.
**Uses LaunchPilot to:** gate new code behind a flag, roll out gradually,
and hit the kill switch the moment an alert fires — without a deploy.
**Frustration LaunchPilot removes:** flag state living in application code
or a config file with no audit trail of who changed what, and no fast way
to revert.

## Devi — Data Scientist / Product Analyst
**Needs:** statistical significance reporting she can actually trust, not
a vendor's black-box "confidence" score.
**Uses LaunchPilot to:** verify the underlying test (two-proportion z-test,
95% CI, sample-size-adequacy) is one she'd sign off on, and use the same
numbers Priya sees so there's no separate analysis to reconcile.
**Frustration LaunchPilot removes:** being the bottleneck every time
someone asks "is this real," because now the number is computed
consistently and shown to everyone.

## Marcus — Executive (VP Product / CTO)
**Needs:** a risk-scored view of what's rolling out and why, without
digging into individual flags.
**Uses LaunchPilot to:** check the Executive dashboard before a leadership
sync — active experiments, pending approvals, and anything with a high
risk score currently live in production.
**Frustration LaunchPilot removes:** finding out about a risky rollout
after something breaks, instead of seeing it flagged for approval first.
