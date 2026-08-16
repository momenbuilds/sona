// Smoke test for src/lib/dementiaRisk.ts. Not part of the app build.
// Usage: node scripts/check-dementia-risk.mts

import assert from "node:assert/strict";
import { computeDementiaRisk } from "../src/lib/dementiaRisk.ts";
import type { RecordingMetrics } from "../src/lib/types.ts";

function metrics(overrides: Partial<RecordingMetrics>): RecordingMetrics {
  return {
    id: "test",
    timestamp: 0,
    durationSec: 60,
    wpm: null,
    articulationRateWpm: null,
    pauseCount: 0,
    longPauseCount: 0,
    avgPauseSec: 0,
    longestPauseSec: 0,
    silencePercent: 0,
    speechOnsetSec: 0,
    wordCount: null,
    fillerCount: null,
    fillerPerMin: null,
    repeatedWords: null,
    lexicalDiversity: null,
    avgPitchHz: null,
    pitchVariation: null,
    minPitchHz: null,
    maxPitchHz: null,
    pitchRangeHz: null,
    vocalEnergy: null,
    vocalEnergyVariation: null,
    transcriptAvailable: false,
    stabilityScore: null,
    ...overrides,
  };
}

// Realistic "not enough to say anything" case: no transcript (wpm, filler,
// repeats, lexical diversity all null) and pitch tracking failed (<5 voiced
// frames). Only the 5 always-present timing fields are left -> below the
// 6-feature floor -> null, not a guess dressed up as a real score.
const sparse = computeDementiaRisk(metrics({}));
assert.equal(sparse, null, "expected null with too few available features");

const healthy = metrics({
  wpm: 150,
  avgPauseSec: 0.4,
  pauseCount: 6,
  longPauseCount: 0,
  silencePercent: 10,
  speechOnsetSec: 0.5,
  fillerPerMin: 1,
  repeatedWords: 0,
  lexicalDiversity: 0.85,
  pitchVariation: 30,
});

const concerning = metrics({
  wpm: 85,
  avgPauseSec: 1.2,
  pauseCount: 20,
  longPauseCount: 7,
  silencePercent: 40,
  speechOnsetSec: 2.5,
  fillerPerMin: 10,
  repeatedWords: 4,
  lexicalDiversity: 0.5,
  pitchVariation: 12,
});

const healthyResult = computeDementiaRisk(healthy);
const concerningResult = computeDementiaRisk(concerning);

assert.ok(healthyResult, "expected a result for a fully-populated recording");
assert.ok(concerningResult, "expected a result for a fully-populated recording");
assert.ok(healthyResult.probability >= 0 && healthyResult.probability <= 1, "probability out of [0,1]");
assert.ok(concerningResult.probability >= 0 && concerningResult.probability <= 1, "probability out of [0,1]");

assert.ok(
  concerningResult.probability > healthyResult.probability,
  `expected concerning-pattern probability (${concerningResult.probability}) > healthy-pattern probability (${healthyResult.probability})`
);
assert.equal(healthyResult.tier, "low");
assert.equal(concerningResult.tier, "elevated");

// An ordinary, unremarkable recording should score low, not "moderate — see
// a doctor". This is the single most likely thing someone actually sees
// when they try the app, so it's the one case that most needs to be sane.
const ordinary = metrics({
  wpm: 132,
  avgPauseSec: 0.52,
  pauseCount: 8,
  longPauseCount: 1,
  silencePercent: 16,
  speechOnsetSec: 0.85,
  fillerPerMin: 3,
  repeatedWords: 1,
  lexicalDiversity: 0.73,
  pitchVariation: 24,
});
const ordinaryResult = computeDementiaRisk(ordinary);
assert.ok(ordinaryResult, "expected a result for a fully-populated recording");
assert.ok(
  ordinaryResult.percent < 33,
  `expected an ordinary recording to score low, got ${ordinaryResult.percent}%`
);
assert.equal(ordinaryResult.tier, "low");

// Duration invariance: the same speaking pattern (identical rates) recorded
// for 30s vs. 180s should score the same, not "riskier because it ran
// longer". pauseCount/longPauseCount/repeatedWords are scaled with
// duration here specifically to hold their per-minute rate constant.
const shortTake = metrics({
  durationSec: 30,
  wpm: 132,
  avgPauseSec: 0.52,
  pauseCount: 4,
  longPauseCount: 1,
  silencePercent: 16,
  speechOnsetSec: 0.85,
  fillerPerMin: 3,
  repeatedWords: 1,
  lexicalDiversity: 0.73,
  pitchVariation: 24,
});
const longTake = metrics({
  durationSec: 180,
  wpm: 132,
  avgPauseSec: 0.52,
  pauseCount: 24,
  longPauseCount: 6,
  silencePercent: 16,
  speechOnsetSec: 0.85,
  fillerPerMin: 3,
  repeatedWords: 6,
  lexicalDiversity: 0.73,
  pitchVariation: 24,
});
const shortResult = computeDementiaRisk(shortTake);
const longResult = computeDementiaRisk(longTake);
assert.ok(shortResult && longResult, "expected results for both durations");
assert.ok(
  Math.abs(shortResult.percent - longResult.percent) <= 3,
  `expected duration-invariant scoring, got ${shortResult.percent}% at 30s vs. ${longResult.percent}% at 180s`
);

console.log("dementiaRisk self-check passed:", {
  healthy: healthyResult.percent,
  concerning: concerningResult.percent,
  ordinary: ordinaryResult.percent,
  shortTake: shortResult.percent,
  longTake: longResult.percent,
});
