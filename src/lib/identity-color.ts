const IDENTITY_TOKENS = ["coral", "violet", "teal", "gold", "sky", "plum"] as const;
export type IdentityToken = (typeof IDENTITY_TOKENS)[number];

// FNV-1a — small, dependency-free, stable across runs for the same id.
function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getIdentityToken(id: string): IdentityToken {
  return IDENTITY_TOKENS[fnv1aHash(id) % IDENTITY_TOKENS.length];
}

// Tailwind needs literal class strings — see src/lib/risk.ts for the same
// constraint. These lookups exist so template-interpolated names never have
// to appear in component source.
export const IDENTITY_TEXT: Record<IdentityToken, string> = {
  coral: "text-id-coral",
  violet: "text-id-violet",
  teal: "text-id-teal",
  gold: "text-id-gold",
  sky: "text-id-sky",
  plum: "text-id-plum",
};

export const IDENTITY_BG: Record<IdentityToken, string> = {
  coral: "bg-id-coral",
  violet: "bg-id-violet",
  teal: "bg-id-teal",
  gold: "bg-id-gold",
  sky: "bg-id-sky",
  plum: "bg-id-plum",
};

export const IDENTITY_BG_WASH: Record<IdentityToken, string> = {
  coral: "bg-id-coral-wash",
  violet: "bg-id-violet-wash",
  teal: "bg-id-teal-wash",
  gold: "bg-id-gold-wash",
  sky: "bg-id-sky-wash",
  plum: "bg-id-plum-wash",
};

export const IDENTITY_BG_DEEP: Record<IdentityToken, string> = {
  coral: "bg-id-coral-deep",
  violet: "bg-id-violet-deep",
  teal: "bg-id-teal-deep",
  gold: "bg-id-gold-deep",
  sky: "bg-id-sky-deep",
  plum: "bg-id-plum-deep",
};

export const IDENTITY_BORDER_TOP: Record<IdentityToken, string> = {
  coral: "border-t-id-coral",
  violet: "border-t-id-violet",
  teal: "border-t-id-teal",
  gold: "border-t-id-gold",
  sky: "border-t-id-sky",
  plum: "border-t-id-plum",
};

export const IDENTITY_STROKE: Record<IdentityToken, string> = {
  coral: "stroke-id-coral",
  violet: "stroke-id-violet",
  teal: "stroke-id-teal",
  gold: "stroke-id-gold",
  sky: "stroke-id-sky",
  plum: "stroke-id-plum",
};

export const IDENTITY_STROKE_DEEP: Record<IdentityToken, string> = {
  coral: "stroke-id-coral-deep",
  violet: "stroke-id-violet-deep",
  teal: "stroke-id-teal-deep",
  gold: "stroke-id-gold-deep",
  sky: "stroke-id-sky-deep",
  plum: "stroke-id-plum-deep",
};

// Control (index 0) gets the experiment's base hue; every other arm gets the
// "-deep" tint of the same hue, so a multi-arm test still reads as "one
// experiment" rather than pulling in unrelated hues per variant.
export function getVariantBg(experimentId: string, variantIndex: number): string {
  const token = getIdentityToken(experimentId);
  return variantIndex === 0 ? IDENTITY_BG[token] : IDENTITY_BG_DEEP[token];
}

export function getVariantStroke(experimentId: string, variantIndex: number): string {
  const token = getIdentityToken(experimentId);
  return variantIndex === 0 ? IDENTITY_STROKE[token] : IDENTITY_STROKE_DEEP[token];
}
