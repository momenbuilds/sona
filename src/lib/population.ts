// Second comparison layer: how a recording sits against a small reference
// sample of general speech, instead of against the user's own history.
// Kept deliberately separate from score.ts's personal-baseline comparison
// rather than unified into one generic comparator — the two use different
// math (percentile lookup vs. rolling-average deviation), different metric
// sets, and mixing them would make it easy to blur "different from you"
// with "different from a small external sample" in the UI.
//
// Only three RecordingMetrics fields are compared here. Most of the rest
// are computed from reference clips that are short, scripted, single-
// sentence read narration (see referenceStats.ts) and so don't carry
// meaningful pause, filler, or repetition structure. articulationRateWpm is
// additionally excluded even though it's rate-based, because the silence
// detector (tuned for long recordings) misreads padding on these short
// clips and inflates it into an artifact — see build-reference-stats.mts.
// avgPitchHz and pitchRangeHz are bimodal by sex, and vocalEnergy is a
// function of mic gain/distance more than of the voice — both would make a
// same-corpus percentile comparison actively misleading rather than just
// imprecise. See REFERENCE_META in referenceStats.ts for the corpus
// details and PopulationMetricKey for the exact set.

import { REFERENCE_META, REFERENCE_STATS, MetricPercentiles, PopulationMetricKey } from "./referenceStats";
import { RecordingMetrics } from "./types";

export { REFERENCE_META };

interface PopulationDef {
  key: PopulationMetricKey;
  label: string;
}

const POPULATION_METRICS: PopulationDef[] = [
  { key: "wpm", label: "Speaking pace" },
  { key: "pitchVariation", label: "Pitch variation" },
  { key: "vocalEnergyVariation", label: "Energy variability" },
];

export interface PopulationNote {
  key: PopulationMetricKey;
  label: string;
  current: number;
  percentile: number;
  direction: "up" | "down" | "flat";
}

export interface PopulationResult {
  notes: PopulationNote[];
}

const PERCENTILE_POINTS: { p: number; key: keyof MetricPercentiles }[] = [
  { p: 5, key: "p5" },
  { p: 10, key: "p10" },
  { p: 25, key: "p25" },
  { p: 50, key: "p50" },
  { p: 75, key: "p75" },
  { p: 90, key: "p90" },
  { p: 95, key: "p95" },
];

// Locates a value in the piecewise-linear CDF built from the reference
// percentile breakpoints (not a Gaussian z-score — wpm and similar metrics
// are right-skewed, and this needs no normality assumption). Values outside
// [p5, p95] clamp to the nearest edge rather than extrapolating past a
// ~200-clip sample.
function percentileOf(value: number, stats: MetricPercentiles): number {
  const points = PERCENTILE_POINTS.map(({ p, key }) => ({ p, v: stats[key] }));
  const first = points[0];
  const last = points[points.length - 1];
  if (value <= first.v) return first.p;
  if (value >= last.v) return last.p;
  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1];
    const hi = points[i];
    if (value <= hi.v) {
      if (hi.v === lo.v) return lo.p;
      const t = (value - lo.v) / (hi.v - lo.v);
      return lo.p + t * (hi.p - lo.p);
    }
  }
  return 50;
}

// No aggregate "typicality score": collapsing percentile position to a
// single number that peaks at the median and falls off in both directions
// makes p5 and p95 indistinguishable (both read as "atypical"), even though
// one means unusually flat/slow and the other unusually expressive/fast.
// Each metric keeps its own signed percentile and direction instead —
// there's nothing to average.
export function computePopulationComparison(current: RecordingMetrics): PopulationResult {
  const notes: PopulationNote[] = [];

  for (const def of POPULATION_METRICS) {
    const value = current[def.key];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    const percentile = percentileOf(value, REFERENCE_STATS[def.key]);
    const direction = percentile > 55 ? "up" : percentile < 45 ? "down" : "flat";
    notes.push({ key: def.key, label: def.label, current: value, percentile, direction });
  }

  notes.sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50));

  return { notes };
}

export function buildPopulationInsights(notes: PopulationNote[]): string[] {
  return notes.map((n) => `${describePopulationNote(n)}.`);
}

function ordinal(n: number): string {
  const rounded = Math.round(n);
  const rem100 = rounded % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}

function describePopulationNote(n: PopulationNote): string {
  const pct = ordinal(n.percentile);
  switch (n.key) {
    case "wpm":
      return `Your speaking pace was around the ${pct} percentile of the reference sample`;
    case "pitchVariation":
      return `Your pitch variation was around the ${pct} percentile of the reference sample`;
    case "vocalEnergyVariation":
      return `Your energy variability was around the ${pct} percentile of the reference sample`;
    default:
      return `This measurement was around the ${pct} percentile of the reference sample`;
  }
}
