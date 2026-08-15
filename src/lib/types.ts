export interface RecordingMetrics {
  id: string;
  timestamp: number;

  // Timing
  durationSec: number;
  wpm: number | null;
  articulationRateWpm: number | null;
  pauseCount: number;
  longPauseCount: number;
  avgPauseSec: number;
  longestPauseSec: number;
  silencePercent: number;
  speechOnsetSec: number;

  // Fluency (transcript-dependent)
  wordCount: number | null;
  fillerCount: number | null;
  fillerPerMin: number | null;
  repeatedWords: number | null;
  lexicalDiversity: number | null;

  // Voice
  avgPitchHz: number | null;
  pitchVariation: number | null;
  minPitchHz: number | null;
  maxPitchHz: number | null;
  pitchRangeHz: number | null;
  vocalEnergy: number | null;
  vocalEnergyVariation: number | null;

  transcriptAvailable: boolean;
  transcript?: string;

  stabilityScore: number | null;
}

export type MetricKey =
  | "wpm"
  | "articulationRateWpm"
  | "avgPauseSec"
  | "pauseCount"
  | "longPauseCount"
  | "longestPauseSec"
  | "silencePercent"
  | "speechOnsetSec"
  | "fillerPerMin"
  | "repeatedWords"
  | "lexicalDiversity"
  | "avgPitchHz"
  | "pitchVariation"
  | "pitchRangeHz"
  | "vocalEnergy"
  | "vocalEnergyVariation";

export type MetricCategory = "timing" | "fluency" | "voice";

export interface Baseline {
  count: number;
  averages: Partial<Record<MetricKey, number>>;
}

export interface ChangeNote {
  key: MetricKey;
  category: MetricCategory;
  label: string;
  current: number;
  baseline: number;
  percentDiff: number;
  direction: "up" | "down";
}

export interface CategoryScore {
  category: MetricCategory;
  label: string;
  score: number | null;
  status: string;
}
