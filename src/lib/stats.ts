import * as ss from "simple-statistics";

export interface VariantSample {
  variantId: string;
  variantName: string;
  isControl: boolean;
  exposures: number;
  conversions: number;
}

export interface SignificanceResult {
  variantId: string;
  variantName: string;
  conversionRate: number;
  liftVsControl: number | null;
  zScore: number | null;
  pValue: number | null;
  confidenceIntervalLow: number | null;
  confidenceIntervalHigh: number | null;
  isSignificant: boolean;
  sampleSizeAdequate: boolean;
  requiredSampleSizePerVariant: number;
}

const SIGNIFICANCE_ALPHA = 0.05;
const MIN_DETECTABLE_EFFECT = 0.05; // 5 percentage points, used for sample-size guidance
const Z_ALPHA_TWO_TAILED = 1.96;
const Z_POWER_80 = 0.84;

/** Two-tailed p-value for a z statistic using the standard normal CDF. */
function pValueFromZ(z: number): number {
  const cdf = ss.cumulativeStdNormalProbability(Math.abs(z));
  return 2 * (1 - cdf);
}

/**
 * Required sample size per arm for a two-proportion z-test, given a
 * baseline conversion rate and the minimum effect we want to be able to
 * detect at alpha=0.05 / power=80%. Standard formula used by most
 * commercial experimentation tools (Evan Miller / Optimizely style).
 */
function requiredSampleSize(baselineRate: number): number {
  const p = Math.min(Math.max(baselineRate, 0.01), 0.99);
  const delta = MIN_DETECTABLE_EFFECT;
  const pooled = p + delta / 2;
  const numerator =
    Math.pow(Z_ALPHA_TWO_TAILED + Z_POWER_80, 2) * 2 * pooled * (1 - pooled);
  return Math.ceil(numerator / Math.pow(delta, 2));
}

/**
 * Two-proportion z-test comparing each variant against the control,
 * plus a Wald 95% confidence interval on each variant's own conversion rate.
 */
export function computeSignificance(samples: VariantSample[]): SignificanceResult[] {
  const control = samples.find((s) => s.isControl) ?? samples[0];
  const controlRate = control.exposures > 0 ? control.conversions / control.exposures : 0;
  const requiredN = requiredSampleSize(controlRate);

  return samples.map((s) => {
    const rate = s.exposures > 0 ? s.conversions / s.exposures : 0;
    const se = s.exposures > 0 ? Math.sqrt((rate * (1 - rate)) / s.exposures) : null;
    const ciLow = se !== null ? Math.max(0, rate - 1.96 * se) : null;
    const ciHigh = se !== null ? Math.min(1, rate + 1.96 * se) : null;

    if (s.isControl || control.exposures === 0 || s.exposures === 0) {
      return {
        variantId: s.variantId,
        variantName: s.variantName,
        conversionRate: rate,
        liftVsControl: s.isControl ? 0 : null,
        zScore: null,
        pValue: null,
        confidenceIntervalLow: ciLow,
        confidenceIntervalHigh: ciHigh,
        isSignificant: false,
        sampleSizeAdequate: s.exposures >= requiredN,
        requiredSampleSizePerVariant: requiredN,
      };
    }

    const pooledRate =
      (s.conversions + control.conversions) / (s.exposures + control.exposures);
    const pooledSe = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / s.exposures + 1 / control.exposures)
    );
    const z = pooledSe > 0 ? (rate - controlRate) / pooledSe : 0;
    const p = pooledSe > 0 ? pValueFromZ(z) : 1;
    const lift = controlRate > 0 ? (rate - controlRate) / controlRate : null;

    return {
      variantId: s.variantId,
      variantName: s.variantName,
      conversionRate: rate,
      liftVsControl: lift,
      zScore: z,
      pValue: p,
      confidenceIntervalLow: ciLow,
      confidenceIntervalHigh: ciHigh,
      isSignificant: p < SIGNIFICANCE_ALPHA,
      sampleSizeAdequate: s.exposures >= requiredN && control.exposures >= requiredN,
      requiredSampleSizePerVariant: requiredN,
    };
  });
}

export function mean(values: number[]): number {
  return values.length ? ss.mean(values) : 0;
}

export function standardDeviation(values: number[]): number {
  return values.length > 1 ? ss.standardDeviation(values) : 0;
}
