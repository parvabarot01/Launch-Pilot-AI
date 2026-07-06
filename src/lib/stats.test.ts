import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSignificance, type VariantSample } from "./stats";

function samples(control: Partial<VariantSample>, treatment: Partial<VariantSample>): VariantSample[] {
  return [
    { variantId: "control", variantName: "Control", isControl: true, exposures: 0, conversions: 0, ...control },
    { variantId: "treatment", variantName: "Treatment", isControl: false, exposures: 0, conversions: 0, ...treatment },
  ];
}

test("identical conversion rates are not significant", () => {
  const results = computeSignificance(
    samples({ exposures: 5000, conversions: 500 }, { exposures: 5000, conversions: 500 })
  );
  const treatment = results.find((r) => r.variantId === "treatment")!;
  assert.equal(treatment.isSignificant, false);
  assert.equal(treatment.liftVsControl, 0);
  assert.ok(treatment.pValue !== null && treatment.pValue > 0.05);
});

test("a large, clear lift is flagged significant with adequate sample size", () => {
  const results = computeSignificance(
    samples({ exposures: 5000, conversions: 500 }, { exposures: 5000, conversions: 750 })
  );
  const treatment = results.find((r) => r.variantId === "treatment")!;
  assert.equal(treatment.isSignificant, true);
  assert.ok(treatment.pValue !== null && treatment.pValue < 0.05);
  assert.ok(treatment.liftVsControl !== null && treatment.liftVsControl > 0);
  assert.equal(treatment.sampleSizeAdequate, true);
});

test("small samples are never treated as significant enough to act on", () => {
  const results = computeSignificance(
    samples({ exposures: 20, conversions: 2 }, { exposures: 20, conversions: 5 })
  );
  const treatment = results.find((r) => r.variantId === "treatment")!;
  assert.equal(treatment.sampleSizeAdequate, false);
});

test("control always reports zero lift and is never flagged significant", () => {
  const results = computeSignificance(
    samples({ exposures: 1000, conversions: 100 }, { exposures: 1000, conversions: 200 })
  );
  const control = results.find((r) => r.variantId === "control")!;
  assert.equal(control.liftVsControl, 0);
  assert.equal(control.isSignificant, false);
});

test("zero-exposure variant does not throw and is not significant", () => {
  const results = computeSignificance(samples({ exposures: 1000, conversions: 100 }, { exposures: 0, conversions: 0 }));
  const treatment = results.find((r) => r.variantId === "treatment")!;
  assert.equal(treatment.conversionRate, 0);
  assert.equal(treatment.isSignificant, false);
});

test("confidence interval is centered on the observed rate and within [0,1]", () => {
  const results = computeSignificance(samples({ exposures: 1000, conversions: 500 }, { exposures: 1000, conversions: 500 }));
  for (const r of results) {
    assert.ok(r.confidenceIntervalLow! >= 0 && r.confidenceIntervalLow! <= r.conversionRate);
    assert.ok(r.confidenceIntervalHigh! <= 1 && r.confidenceIntervalHigh! >= r.conversionRate);
  }
});
