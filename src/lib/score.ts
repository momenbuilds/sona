import { Baseline, CategoryScore, ChangeNote, MetricCategory, MetricKey, RecordingMetrics } from "./types";

// Metrics that speech research has associated with cognitive decline
// (pausing more, slowing down, losing word variety, word-finding trouble).
// This is a trend flag over your own history, not a diagnosis and not a
// probability. See buildCognitiveFlag below for how it's used.
const COGNITIVE_SIGNALS: { key: MetricKey; label: string; concerningDirection: "up" | "down" }[] = [
  { key: "avgPauseSec", label: "longer pauses", concerningDirection: "up" },
  { key: "longPauseCount", label: "more long pauses", concerningDirection: "up" },
  { key: "wpm", label: "a slower speaking pace", concerningDirection: "down" },
  { key: "lexicalDiversity", label: "less word variety", concerningDirection: "down" },
  { key: "repeatedWords", label: "more repeated words", concerningDirection: "up" },
];

export interface CognitiveFlag {
  flagged: boolean;
  matchedLabels: string[];
}

// Looks for a sustained trend across your recording history rather than
// judging a single session, since one bad-mic or tired day shouldn't mean
// anything on its own. Needs at least 4 recordings to say anything at all.
export function buildCognitiveFlag(history: RecordingMetrics[]): CognitiveFlag | null {
  if (history.length < 4) return null;

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const mid = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, mid);
  const recent = sorted.slice(mid);

  const avg = (arr: RecordingMetrics[], key: MetricKey): number | null => {
    const values = arr.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const matched: string[] = [];
  for (const signal of COGNITIVE_SIGNALS) {
    const earlierAvg = avg(earlier, signal.key);
    const recentAvg = avg(recent, signal.key);
    if (earlierAvg === null || recentAvg === null || earlierAvg === 0) continue;

    const diff = (recentAvg - earlierAvg) / Math.abs(earlierAvg);
    const isConcerning = signal.concerningDirection === "up" ? diff > 0.15 : diff < -0.15;
    if (isConcerning) matched.push(signal.label);
  }

  return { flagged: matched.length >= 3, matchedLabels: matched };
}

interface FeatureDef {
  key: MetricKey;
  category: MetricCategory;
  label: string;
  weight: number;
}

const FEATURES: FeatureDef[] = [
  { key: "wpm", category: "timing", label: "Speaking pace", weight: 8 },
  { key: "articulationRateWpm", category: "timing", label: "Articulation rate", weight: 8 },
  { key: "avgPauseSec", category: "timing", label: "Average pause", weight: 8 },
  { key: "pauseCount", category: "timing", label: "Pause count", weight: 4 },
  { key: "longPauseCount", category: "timing", label: "Long pauses", weight: 5 },
  { key: "longestPauseSec", category: "timing", label: "Longest pause", weight: 4 },
  { key: "silencePercent", category: "timing", label: "Silence", weight: 6 },
  { key: "speechOnsetSec", category: "timing", label: "Response time", weight: 4 },

  { key: "fillerPerMin", category: "fluency", label: "Filler words", weight: 10 },
  { key: "repeatedWords", category: "fluency", label: "Repeated words", weight: 6 },
  { key: "lexicalDiversity", category: "fluency", label: "Word variety", weight: 8 },

  { key: "avgPitchHz", category: "voice", label: "Average pitch", weight: 5 },
  { key: "pitchVariation", category: "voice", label: "Pitch variation", weight: 9 },
  { key: "pitchRangeHz", category: "voice", label: "Pitch range", weight: 5 },
  { key: "vocalEnergy", category: "voice", label: "Vocal energy", weight: 7 },
  { key: "vocalEnergyVariation", category: "voice", label: "Energy variability", weight: 7 },
];

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  timing: "Timing",
  fluency: "Fluency",
  voice: "Voice",
};

// How much each category contributes to the overall score, when available.
const CATEGORY_WEIGHTS: Record<MetricCategory, number> = {
  timing: 40,
  fluency: 30,
  voice: 30,
};

const MAX_DEVIATION = 0.6; // deviations beyond 60% are capped, not extrapolated

export interface StabilityResult {
  score: number | null;
  changes: ChangeNote[];
  categoryScores: CategoryScore[];
}

function deviationOf(current: number, base: number): number {
  const rawDiff = (current - base) / Math.abs(base);
  return Math.min(Math.abs(rawDiff), MAX_DEVIATION) / MAX_DEVIATION;
}

export function computeStability(current: RecordingMetrics, baseline: Baseline): StabilityResult {
  if (baseline.count === 0) {
    return { score: null, changes: [], categoryScores: [] };
  }

  const changes: ChangeNote[] = [];
  const categoryPenalty: Record<MetricCategory, { weighted: number; totalWeight: number }> = {
    timing: { weighted: 0, totalWeight: 0 },
    fluency: { weighted: 0, totalWeight: 0 },
    voice: { weighted: 0, totalWeight: 0 },
  };

  for (const feature of FEATURES) {
    const baseValue = baseline.averages[feature.key];
    const currentValue = current[feature.key];
    if (typeof baseValue !== "number" || typeof currentValue !== "number" || baseValue === 0) {
      continue;
    }

    const deviation = deviationOf(currentValue, baseValue);
    const bucket = categoryPenalty[feature.category];
    bucket.weighted += deviation * feature.weight;
    bucket.totalWeight += feature.weight;

    const rawDiff = (currentValue - baseValue) / Math.abs(baseValue);
    if (Math.abs(rawDiff) >= 0.1) {
      changes.push({
        key: feature.key,
        category: feature.category,
        label: feature.label,
        current: currentValue,
        baseline: baseValue,
        percentDiff: rawDiff * 100,
        direction: rawDiff > 0 ? "up" : "down",
      });
    }
  }

  const categoryScores: CategoryScore[] = (Object.keys(categoryPenalty) as MetricCategory[]).map(
    (category) => {
      const bucket = categoryPenalty[category];
      if (bucket.totalWeight === 0) {
        return { category, label: CATEGORY_LABELS[category], score: null, status: "Not enough data" };
      }
      const score = Math.round(100 - (bucket.weighted / bucket.totalWeight) * 100);
      const clamped = Math.max(0, Math.min(100, score));
      return { category, label: CATEGORY_LABELS[category], score: clamped, status: statusLabel(clamped) };
    }
  );

  let overallWeighted = 0;
  let overallWeight = 0;
  for (const cs of categoryScores) {
    if (cs.score === null) continue;
    const w = CATEGORY_WEIGHTS[cs.category];
    overallWeighted += cs.score * w;
    overallWeight += w;
  }

  const score = overallWeight > 0 ? Math.round(overallWeighted / overallWeight) : null;

  changes.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

  return { score, changes, categoryScores };
}

export function statusLabel(score: number): string {
  if (score >= 85) return "Stable";
  if (score >= 70) return "Slightly different";
  if (score >= 50) return "Different";
  return "Notably different";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Mostly within your normal range";
  if (score >= 70) return "Slightly different from your usual pattern";
  if (score >= 50) return "Noticeably different from your recent baseline";
  return "Significantly different from your recent baseline";
}

// Builds factual, per-category sentences directly from measured deviations.
// Never infers a cause — only describes the measurements. Picks at most one
// change per category so the summary spans your speech rather than repeating.
export function buildInsights(changes: ChangeNote[]): string[] {
  if (changes.length === 0) {
    return ["Your voice was mostly consistent with your previous recordings."];
  }

  const seenCategories = new Set<MetricCategory>();
  const picked: ChangeNote[] = [];
  for (const c of changes) {
    if (seenCategories.has(c.category)) continue;
    seenCategories.add(c.category);
    picked.push(c);
    if (picked.length === 3) break;
  }

  return picked.map((c) => `${capitalize(describeChange(c))}.`);
}

// Kept for the "building baseline" first-few-recordings case where changes
// are always empty (no comparisons yet), and as a single-sentence fallback.
export function buildExplanation(changes: ChangeNote[]): string {
  return buildInsights(changes).slice(0, 2).join(" ");
}

// A short, readable writeup of the whole session, meant to read like a
// person explaining the numbers rather than a list of stats.
export function buildNarrative(
  score: number | null,
  categoryScores: CategoryScore[],
  changes: ChangeNote[],
  enoughForComparisons: boolean
): string {
  if (!enoughForComparisons) {
    return "This is early in your history, so there isn't enough of your own baseline yet to compare against. Record a few more times and this section will start explaining how each session compares to your normal pattern.";
  }
  if (score === null) return "";

  const lead =
    score >= 85
      ? `Your Voice Stability score today is ${score}. That means your speech mostly matched how you usually sound.`
      : score >= 70
      ? `Your Voice Stability score today is ${score}. That's a bit different from your usual pattern, but not a big shift.`
      : score >= 50
      ? `Your Voice Stability score today is ${score}. That's noticeably different from how you usually sound.`
      : `Your Voice Stability score today is ${score}. That's a significant shift from your recent recordings.`;

  const categoryBits = categoryScores
    .filter((c) => c.score !== null)
    .map((c) => `${c.label.toLowerCase()} was ${c.status.toLowerCase().replace("notably different", "notably different than usual")}`);
  const categorySentence = categoryBits.length > 0 ? `Breaking it down, ${categoryBits.join(", ")}.` : "";

  const topChanges = changes.slice(0, 2).map((c) => describeChange(c));
  const changeSentence =
    topChanges.length > 0
      ? `The biggest differences were that ${topChanges.join(", and ")}.`
      : score < 85
      ? "No single measurement stands out on its own, the difference is spread evenly across a few smaller things."
      : "";

  return [lead, categorySentence, changeSentence].filter(Boolean).join(" ");
}

function describeChange(c: ChangeNote): string {
  const magnitude = Math.abs(c.percentDiff) >= 25 ? "notably" : "slightly";
  switch (c.key) {
    case "wpm":
      return `your speaking pace was ${magnitude} ${c.direction === "down" ? "slower" : "faster"} than usual`;
    case "articulationRateWpm":
      return `your pace while actually talking was ${magnitude} ${c.direction === "down" ? "slower" : "faster"} than usual`;
    case "avgPauseSec":
      return `your pauses were ${magnitude} ${c.direction === "up" ? "longer" : "shorter"} than usual`;
    case "pauseCount":
      return `you paused ${magnitude} ${c.direction === "up" ? "more" : "less"} often than usual`;
    case "longPauseCount":
      return `you had ${magnitude} ${c.direction === "up" ? "more" : "fewer"} long pauses than usual`;
    case "longestPauseSec":
      return `your longest pause was ${magnitude} ${c.direction === "up" ? "longer" : "shorter"} than usual`;
    case "silencePercent":
      return `you had ${magnitude} ${c.direction === "up" ? "more" : "less"} silence than usual`;
    case "speechOnsetSec":
      return `you took ${magnitude} ${c.direction === "up" ? "longer" : "less time"} to start speaking than usual`;
    case "fillerPerMin":
      return `you used ${magnitude} ${c.direction === "up" ? "more" : "fewer"} filler words than usual`;
    case "repeatedWords":
      return `you repeated words ${magnitude} ${c.direction === "up" ? "more" : "less"} than usual`;
    case "lexicalDiversity":
      return `your word variety was ${magnitude} ${c.direction === "up" ? "higher" : "lower"} than usual`;
    case "avgPitchHz":
      return `your average pitch was ${magnitude} ${c.direction === "up" ? "higher" : "lower"} than usual`;
    case "pitchVariation":
      return `your pitch variation was ${magnitude} ${c.direction === "up" ? "higher" : "lower"} than usual`;
    case "pitchRangeHz":
      return `your pitch range was ${magnitude} ${c.direction === "up" ? "wider" : "narrower"} than usual`;
    case "vocalEnergy":
      return `your vocal energy was ${magnitude} ${c.direction === "up" ? "higher" : "lower"} than usual`;
    case "vocalEnergyVariation":
      return `your vocal energy was ${magnitude} ${c.direction === "up" ? "less" : "more"} consistent than usual`;
    default:
      return "one of your speech patterns differed from your usual baseline";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
