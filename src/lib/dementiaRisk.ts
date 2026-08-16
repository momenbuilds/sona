import type { RecordingMetrics } from "./types";
import {
  DEMENTIA_RISK_BIAS,
  DEMENTIA_RISK_FEATURES,
  DEMENTIA_RISK_META,
  DEMENTIA_RISK_NORMALIZATION,
  DEMENTIA_RISK_PER_MINUTE_KEYS,
  DEMENTIA_RISK_WEIGHTS,
} from "./dementiaRiskModel.ts";

export { DEMENTIA_RISK_META };

// Below this many present features, the standardized-missing-as-0 handling
// below leans too much on the model's prior (the bias term) to mean much.
const MIN_AVAILABLE_FEATURES = 6;

export type DementiaRiskTier = "low" | "moderate" | "elevated";

export interface DementiaRiskResult {
  probability: number; // 0-1
  percent: number; // rounded 0-100, for display
  tier: DementiaRiskTier;
  availableFeatures: number;
  totalFeatures: number;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function tierOf(probability: number): DementiaRiskTier {
  if (probability < 0.33) return "low";
  if (probability < 0.66) return "moderate";
  return "elevated";
}

const PER_MINUTE_KEYS = new Set(DEMENTIA_RISK_PER_MINUTE_KEYS);

// Scores a single recording against the model in dementiaRiskModel.ts. A
// feature with no value (transcript unavailable, etc.) is simply skipped —
// standardizing to 0 and omitting it from the weighted sum is equivalent to
// imputing it at the training-set mean, a standard way to handle missing
// features in a linear model without biasing the rest of the score.
export function computeDementiaRisk(current: RecordingMetrics): DementiaRiskResult | null {
  let z = DEMENTIA_RISK_BIAS;
  let available = 0;

  // Recordings are free-length (60-90s suggested, not enforced), so raw
  // whole-recording counts (pauseCount, longPauseCount, repeatedWords) are
  // converted to per-minute rates before scoring — otherwise a longer
  // recording reads as riskier just for being longer. See
  // DEMENTIA_RISK_PER_MINUTE_KEYS in dementiaRiskModel.ts.
  const minutes = Math.max(current.durationSec / 60, 1 / 60);

  for (const key of DEMENTIA_RISK_FEATURES) {
    const raw = current[key];
    if (typeof raw !== "number" || Number.isNaN(raw)) continue;
    const value = PER_MINUTE_KEYS.has(key) ? raw / minutes : raw;

    const { mean, std } = DEMENTIA_RISK_NORMALIZATION[key];
    if (std === 0) continue;

    z += DEMENTIA_RISK_WEIGHTS[key] * ((value - mean) / std);
    available++;
  }

  if (available < MIN_AVAILABLE_FEATURES) return null;

  const probability = sigmoid(z);
  return {
    probability,
    percent: Math.round(probability * 100),
    tier: tierOf(probability),
    availableFeatures: available,
    totalFeatures: DEMENTIA_RISK_FEATURES.length,
  };
}

export function dementiaRiskHeadline(tier: DementiaRiskTier): string {
  switch (tier) {
    case "low":
      return "Your speech patterns look broadly typical against the model's reference distribution.";
    case "moderate":
      return "Some of your speech patterns partially resemble the model's higher-risk reference distribution.";
    case "elevated":
      return "Several of your speech patterns resemble the model's higher-risk reference distribution.";
  }
}
