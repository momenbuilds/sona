import { Baseline, MetricKey, RecordingMetrics } from "./types";

const STORAGE_KEY = "sona.recordings.v1";
// One prior recording is enough to compare against — takes 2 and 3 of a
// session unlock the full comparison immediately, rather than requiring
// days of separate visits.
export const BASELINE_MIN_COUNT = 1;
export const SESSION_TAKES = 3;

export function loadRecordings(): RecordingMetrics[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecordingMetrics[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecording(metrics: RecordingMetrics): RecordingMetrics[] {
  const existing = loadRecordings();
  const updated = [...existing, metrics].sort((a, b) => a.timestamp - b.timestamp);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecordings(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

const METRIC_KEYS: MetricKey[] = [
  "wpm",
  "articulationRateWpm",
  "avgPauseSec",
  "pauseCount",
  "longPauseCount",
  "longestPauseSec",
  "silencePercent",
  "speechOnsetSec",
  "fillerPerMin",
  "repeatedWords",
  "lexicalDiversity",
  "avgPitchHz",
  "pitchVariation",
  "pitchRangeHz",
  "vocalEnergy",
  "vocalEnergyVariation",
];

// Baseline = average of all recordings *before* the one being evaluated,
// so a recording is always compared against the user's prior history only.
export function computeBaseline(priorRecordings: RecordingMetrics[]): Baseline {
  const averages: Partial<Record<MetricKey, number>> = {};

  for (const key of METRIC_KEYS) {
    const values = priorRecordings
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (values.length > 0) {
      averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  return { count: priorRecordings.length, averages };
}

export function hasEnoughForBaseline(priorRecordings: RecordingMetrics[]): boolean {
  return priorRecordings.length >= BASELINE_MIN_COUNT;
}
