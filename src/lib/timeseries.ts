// Buckets ISO timestamps into daily counts over the trailing `days` window.
// Used for stat-card sparklines — only ever fed real timestamps already in
// the data model (createdAt fields), never fabricated series.
export function dailyBuckets(isoDates: string[], days = 14): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const iso of isoDates) {
    const age = now - new Date(iso).getTime();
    const bucket = days - 1 - Math.floor(age / dayMs);
    if (bucket >= 0 && bucket < days) buckets[bucket] += 1;
  }

  return buckets;
}
