// One-off generator for src/lib/dementiaRiskModel.ts. Not part of the app
// build — run manually to regenerate the committed model.
//
// Usage: node scripts/build-dementia-model.mts
//
// There is no public, freely-fetchable dataset of (speech features, clinical
// dementia diagnosis) pairs we can pull in a script the way
// build-reference-stats.mts pulls LibriSpeech — the standard corpus for this
// (DementiaBank / the Pitt corpus) is gated behind a manual data-use
// agreement. So instead of real recordings, this generates synthetic
// per-class feature distributions and fits a logistic regression to them.
// The class separation (which features move which direction, roughly how
// much) is set from the *direction and rough magnitude* reported in the
// literature below — it is an approximation for a hackathon demo, not a
// reproduction of measured trial statistics:
//
//  - Fraser, Meltzer & Rudzicz (2016), "Linguistic Features Identify
//    Alzheimer's Disease in Narrative Speech", J. Alzheimers Dis. 49(2).
//    Logistic regression over acoustic/linguistic features on DementiaBank
//    (Cookie Theft picture descriptions), ~81% accuracy AD vs. control —
//    the precedent for "logistic regression over session-level speech
//    features" this script follows.
//  - Pistono et al. and related pause-timing work, and Ding et al. (2024,
//    PMC11709986) "Long Pause Ratio in Speech Reflecting Dementia Severity":
//    AD speech has more and longer pauses, and a higher long-pause ratio,
//    than healthy controls.
//  - Themistocleous et al. / MDPI 2024 case-control ML speech study, and
//    the broader AD-speech literature: reduced speech/articulation rate,
//    reduced lexical diversity (type-token ratio), more word-finding
//    disfluency, in AD speech vs. controls.
//
// Model, features, and this data-generation approach are all disclosed in
// the app UI (see DementiaRiskCard) — this is an unvalidated screening
// heuristic, not a diagnostic tool.

import { writeFile } from "node:fs/promises";
import type { MetricKey } from "../src/lib/types.ts";

// Deterministic PRNG (mulberry32) so regenerating this file from the same
// seed reproduces the same committed weights.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260815);

function gaussian(mean: number, std: number): number {
  const u1 = 1 - rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

interface FeatureDef {
  key: MetricKey;
  controlMean: number;
  controlStd: number;
  dementiaMean: number;
  dementiaStd: number;
  min: number; // physically impossible below this (counts/durations/percentages)
  max?: number;
  perMinute?: boolean; // raw metric is a whole-recording count, not duration-invariant
}

// Values are set in the app's own units (see audioAnalysis.ts /
// transcriptAnalysis.ts) so the synthetic training distributions land where
// a real Sona recording's metrics actually live, not in some abstract scale.
// Stds are set wide enough that the two classes overlap substantially (real
// dementia-speech classifiers land around 80-85% accuracy, e.g. Fraser et
// al. 2016's 81% — a clean-looking >95% here would just mean the synthetic
// classes were drawn too far apart to be a believable stand-in for that).
//
// pauseCount, longPauseCount, and repeatedWords are raw whole-recording
// counts in RecordingMetrics, but Sona recordings are free-length (the UI
// suggests 60-90s, doesn't enforce it) — a longer recording accumulates more
// pauses and repeats from an identical speaking style, which would make the
// model mostly measure recording length. Values below are per-minute rates
// for these three (perMinute: true), and dementiaRisk.ts divides the raw
// metric by the recording's duration before scoring against them. wpm,
// avgPauseSec, fillerPerMin, and silencePercent are already rate/ratio
// metrics and don't need this.
const FEATURES: FeatureDef[] = [
  { key: "wpm", controlMean: 135, controlStd: 30, dementiaMean: 117.5, dementiaStd: 32, min: 0 },
  { key: "avgPauseSec", controlMean: 0.5, controlStd: 0.28, dementiaMean: 0.7, dementiaStd: 0.4, min: 0 },
  { key: "pauseCount", controlMean: 8, controlStd: 4.5, dementiaMean: 11, dementiaStd: 6.5, min: 0, perMinute: true },
  { key: "longPauseCount", controlMean: 1, controlStd: 1.5, dementiaMean: 2.5, dementiaStd: 3, min: 0, perMinute: true },
  { key: "silencePercent", controlMean: 15, controlStd: 9, dementiaMean: 22.5, dementiaStd: 14, min: 0, max: 100 },
  { key: "speechOnsetSec", controlMean: 0.8, controlStd: 0.6, dementiaMean: 1.3, dementiaStd: 1.1, min: 0 },
  { key: "fillerPerMin", controlMean: 3, controlStd: 3, dementiaMean: 5, dementiaStd: 4, min: 0 },
  { key: "repeatedWords", controlMean: 0.5, controlStd: 1.1, dementiaMean: 1.25, dementiaStd: 2, min: 0, perMinute: true },
  { key: "lexicalDiversity", controlMean: 0.75, controlStd: 0.11, dementiaMean: 0.675, dementiaStd: 0.13, min: 0, max: 1 },
  { key: "pitchVariation", controlMean: 25, controlStd: 11, dementiaMean: 21.5, dementiaStd: 9.5, min: 0 },
];

function clip(v: number, min: number, max?: number): number {
  const lo = Math.max(v, min);
  return max !== undefined ? Math.min(lo, max) : lo;
}

const SAMPLES_PER_CLASS = 4000;

interface Sample {
  x: number[]; // raw feature values, ordered as FEATURES
  y: number; // 1 = dementia-pattern class, 0 = control-pattern class
}

function sampleClass(isDementia: boolean): number[] {
  return FEATURES.map((f) => {
    const raw = isDementia ? gaussian(f.dementiaMean, f.dementiaStd) : gaussian(f.controlMean, f.controlStd);
    return clip(raw, f.min, f.max);
  });
}

const dataset: Sample[] = [];
for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
  dataset.push({ x: sampleClass(false), y: 0 });
  dataset.push({ x: sampleClass(true), y: 1 });
}

// Shuffle (Fisher-Yates) before splitting so the holdout isn't class-blocked.
for (let i = dataset.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
}

const splitAt = Math.floor(dataset.length * 0.8);
const trainSet = dataset.slice(0, splitAt);
const testSet = dataset.slice(splitAt);

// Standardize against the CONTROL class only (not the pooled 50/50 mix), so
// a standardized value of 0 means "typical healthy speaker" rather than
// "halfway between healthy and dementia-pattern". Standardizing against the
// pooled mix would make an average recording score ~50% by construction,
// regardless of how healthy it actually looks — the midpoint of the two
// classes isn't a meaningful reference point for a real population.
const controlRows = trainSet.filter((d) => d.y === 0);
const featureMeans = FEATURES.map((_, i) => controlRows.reduce((s, d) => s + d.x[i], 0) / controlRows.length);
const featureStds = FEATURES.map((_, i) => {
  const m = featureMeans[i];
  const variance = controlRows.reduce((s, d) => s + (d.x[i] - m) ** 2, 0) / controlRows.length;
  return Math.sqrt(variance) || 1;
});

function standardize(x: number[]): number[] {
  return x.map((v, i) => (v - featureMeans[i]) / featureStds[i]);
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

// Plain batch gradient descent, L2-regularized logistic regression. No deps
// needed for 10 features / 6.4k rows.
const LEARNING_RATE = 0.5;
const ITERATIONS = 2000;
const L2 = 0.001;

const weights = new Array(FEATURES.length).fill(0);
let bias = 0;

const trainX = trainSet.map((d) => standardize(d.x));
const trainY = trainSet.map((d) => d.y);
const n = trainX.length;

for (let iter = 0; iter < ITERATIONS; iter++) {
  const gradW = new Array(FEATURES.length).fill(0);
  let gradB = 0;
  for (let i = 0; i < n; i++) {
    const z = bias + trainX[i].reduce((s, v, j) => s + v * weights[j], 0);
    const pred = sigmoid(z);
    const err = pred - trainY[i];
    for (let j = 0; j < FEATURES.length; j++) gradW[j] += err * trainX[i][j];
    gradB += err;
  }
  for (let j = 0; j < FEATURES.length; j++) {
    weights[j] -= (LEARNING_RATE * (gradW[j] / n + L2 * weights[j]));
  }
  bias -= LEARNING_RATE * (gradB / n);
}

function predict(xRaw: number[]): number {
  const xs = standardize(xRaw);
  const z = bias + xs.reduce((s, v, j) => s + v * weights[j], 0);
  return sigmoid(z);
}

let correct = 0;
for (const d of testSet) {
  const p = predict(d.x);
  if ((p >= 0.5 ? 1 : 0) === d.y) correct++;
}
const holdoutAccuracy = correct / testSet.length;

// A typical control-class recording (all features at the control mean, i.e.
// standardized 0) should score low — that's the whole point of centering
// normalization on the control class instead of the pooled mix.
const typicalControlProbability = sigmoid(bias);

// Sanity checks — fail loudly rather than commit a model that doesn't even
// behave sensibly on its own synthetic data.
if (holdoutAccuracy < 0.75) {
  throw new Error(`Holdout accuracy too low (${holdoutAccuracy}) — check FEATURES/training setup.`);
}
if (typicalControlProbability >= 0.33) {
  throw new Error(
    `A typical healthy-pattern recording scores ${(typicalControlProbability * 100).toFixed(1)}% — ` +
      `normalization/training setup is biasing an average case toward "elevated".`
  );
}
for (let j = 0; j < FEATURES.length; j++) {
  const f = FEATURES[j];
  const concerningIsHigher = f.dementiaMean > f.controlMean;
  const weightSaysHigherIsRiskier = weights[j] > 0;
  if (concerningIsHigher !== weightSaysHigherIsRiskier) {
    throw new Error(`Learned weight sign for ${f.key} contradicts its training distributions.`);
  }
}

console.log(`Holdout accuracy: ${(holdoutAccuracy * 100).toFixed(1)}% (${testSet.length} samples)`);
console.log(`Typical healthy-pattern recording scores: ${(typicalControlProbability * 100).toFixed(1)}%`);
console.log("Weights:", FEATURES.map((f, j) => `${f.key}=${weights[j].toFixed(3)}`).join(", "));

const featureKeyUnion = FEATURES.map((f) => `"${f.key}"`).join(" | ");
const normalization = FEATURES.map((f, j) => `  ${f.key}: { mean: ${featureMeans[j].toFixed(4)}, std: ${featureStds[j].toFixed(4)} },`).join("\n");
const weightLines = FEATURES.map((f, j) => `  ${f.key}: ${weights[j].toFixed(6)},`).join("\n");
const perMinuteKeys = FEATURES.filter((f) => f.perMinute).map((f) => `  "${f.key}",`).join("\n");

const output = `// AUTO-GENERATED by scripts/build-dementia-model.mts — do not hand-edit.
// Regenerate: node scripts/build-dementia-model.mts
//
// A logistic regression trained on SYNTHETIC data — class-conditional
// feature distributions set from the direction/rough magnitude reported in
// dementia-speech research literature, not from real diagnosed recordings
// (no such dataset is freely fetchable; see the comment at the top of
// build-dementia-model.mts for sources and the exact caveat). This is an
// unvalidated screening heuristic for a hackathon demo, not a clinically
// validated diagnostic model — see DementiaRiskCard for the disclosure
// shown alongside every score it produces.
//
// Generated ${new Date().toISOString()} from ${SAMPLES_PER_CLASS * 2} synthetic samples
// (${trainSet.length} train / ${testSet.length} holdout).
// Holdout accuracy on synthetic data: ${(holdoutAccuracy * 100).toFixed(1)}%.
// A typical healthy-pattern recording scores: ${(typicalControlProbability * 100).toFixed(1)}%.

import type { MetricKey } from "./types";

// Subset of MetricKey this model actually uses — see FEATURES in
// build-dementia-model.mts for why these ten.
export type DementiaFeatureKey = Extract<MetricKey, ${featureKeyUnion}>;

export const DEMENTIA_RISK_META = {
  generatedAt: "${new Date().toISOString()}",
  sampleCount: ${SAMPLES_PER_CLASS * 2},
  holdoutAccuracy: ${holdoutAccuracy.toFixed(4)},
  syntheticData: true,
} as const;

export const DEMENTIA_RISK_FEATURES: DementiaFeatureKey[] = [
${FEATURES.map((f) => `  "${f.key}",`).join("\n")}
];

// Raw whole-recording counts that dementiaRisk.ts must divide by recording
// duration (minutes) before standardizing — see the FEATURES comment above.
export const DEMENTIA_RISK_PER_MINUTE_KEYS: DementiaFeatureKey[] = [
${perMinuteKeys}
];

export const DEMENTIA_RISK_BIAS = ${bias.toFixed(6)};

export const DEMENTIA_RISK_WEIGHTS: Record<DementiaFeatureKey, number> = {
${weightLines}
};

// mean/std computed from the control (non-dementia-pattern) class only, so
// a standardized value of 0 means "typical healthy speaker" — see the
// standardize() comment in build-dementia-model.mts.
export const DEMENTIA_RISK_NORMALIZATION: Record<DementiaFeatureKey, { mean: number; std: number }> = {
${normalization}
};
`;

await writeFile(new URL("../src/lib/dementiaRiskModel.ts", import.meta.url), output);
console.log("Wrote src/lib/dementiaRiskModel.ts");
