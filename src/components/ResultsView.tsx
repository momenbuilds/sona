import { Baseline, MetricKey, RecordingMetrics } from "@/lib/types";
import { StabilityResult, buildCognitiveFlag, buildInsights, buildNarrative, scoreLabel } from "@/lib/score";
import { BASELINE_MIN_COUNT } from "@/lib/storage";
import StabilityGauge from "./StabilityGauge";
import MetricCard from "./MetricCard";
import CategorySection from "./CategorySection";
import InsightList from "./InsightList";
import AnalysisSummary from "./AnalysisSummary";
import CognitiveHealthNote from "./CognitiveHealthNote";
import HistoryChart from "./HistoryChart";
import ShareCardButton from "./ShareCardButton";
import Button from "./Button";

interface ResultsViewProps {
  current: RecordingMetrics;
  baseline: Baseline;
  stability: StabilityResult;
  history: RecordingMetrics[];
  onRecordAgain: () => void;
  onClearData: () => void;
}

function pct(current: number, base: number | undefined): { text: string; dir: "up" | "down" | "flat" } | null {
  if (base === undefined || base === 0) return null;
  const diff = ((current - base) / Math.abs(base)) * 100;
  if (Math.abs(diff) < 3) return { text: "About usual", dir: "flat" };
  return { text: `${Math.abs(Math.round(diff))}%`, dir: diff > 0 ? "up" : "down" };
}

function formatDay(ts: number, index: number, total: number): string {
  const date = new Date(ts);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (index === total - 1 && isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResultsView({
  current,
  baseline,
  stability,
  history,
  onRecordAgain,
  onClearData,
}: ResultsViewProps) {
  const hasBaseline = baseline.count > 0;
  const enoughForComparisons = baseline.count >= BASELINE_MIN_COUNT;
  const insights = enoughForComparisons ? buildInsights(stability.changes) : [];
  const narrative = buildNarrative(
    stability.score,
    stability.categoryScores,
    stability.changes,
    enoughForComparisons
  );
  const cognitiveFlag = buildCognitiveFlag(history);

  const historyWordCounts = history.map((r) => r.wordCount).filter((v): v is number => v !== null);
  const totalWordsSpoken = historyWordCounts.length > 0 ? historyWordCounts.reduce((a, b) => a + b, 0) : null;

  const recentHistory = [...history].slice(-7);
  const sparkHistory = [...history].slice(-8);

  const sparkline = (key: MetricKey): number[] =>
    sparkHistory.map((r) => r[key]).filter((v): v is number => typeof v === "number");

  const timingScore = stability.categoryScores.find((c) => c.category === "timing");
  const fluencyScore = stability.categoryScores.find((c) => c.category === "fluency");
  const voiceScore = stability.categoryScores.find((c) => c.category === "voice");

  // A category header pill with an empty card under it reads as broken, so
  // only render a section when at least one of its metrics actually has a
  // value for this recording.
  const hasFluencyMetrics =
    current.fillerPerMin !== null ||
    current.repeatedWords !== null ||
    current.lexicalDiversity !== null;
  const hasVoiceMetrics =
    current.avgPitchHz !== null ||
    current.pitchVariation !== null ||
    current.pitchRangeHz !== null ||
    current.vocalEnergy !== null ||
    current.vocalEnergyVariation !== null;

  const speakingPercent = Math.round(100 - current.silencePercent);

  const rowChange = (curVal: number, base: number | undefined) => {
    const result = pct(curVal, base);
    if (!result) return {};
    return { changeLabel: result.text, changeDirection: result.dir };
  };
  const baselineLabelFor = (base: number | undefined, format: (v: number) => string) =>
    hasBaseline && base !== undefined ? `Usually ${format(base)}` : undefined;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-10 pb-16 animate-fade-in-up">
      <StabilityGauge
        score={enoughForComparisons ? stability.score : null}
        label={
          enoughForComparisons && stability.score !== null ? scoreLabel(stability.score) : ""
        }
        baselineCount={baseline.count}
        baselineTarget={BASELINE_MIN_COUNT}
      />

      <div className="grid grid-cols-3 gap-3 -mt-4">
        <QuickStat label="Duration" value={formatClock(current.durationSec)} />
        <QuickStat
          label="Words spoken"
          value={current.wordCount !== null ? String(current.wordCount) : "—"}
        />
        <QuickStat label="Speaking time" value={`${speakingPercent}%`} />
      </div>

      <AnalysisSummary text={narrative} />

      {insights.length > 0 && <InsightList insights={insights} />}

      {timingScore && (
        <CategorySection categoryScore={timingScore}>
          {current.wpm !== null && (
            <MetricCard
              icon="pace"
              label="Speaking pace"
              value={`${Math.round(current.wpm)} WPM`}
              baselineLabel={baselineLabelFor(baseline.averages.wpm, (v) => `${Math.round(v)} WPM`)}
              sparkline={sparkline("wpm")}
              {...rowChange(current.wpm, baseline.averages.wpm)}
            />
          )}
          {current.articulationRateWpm !== null && (
            <MetricCard
              icon="articulation"
              label="Articulation rate"
              value={`${Math.round(current.articulationRateWpm)} WPM`}
              baselineLabel={baselineLabelFor(
                baseline.averages.articulationRateWpm,
                (v) => `${Math.round(v)} WPM`
              )}
              sparkline={sparkline("articulationRateWpm")}
              {...rowChange(current.articulationRateWpm, baseline.averages.articulationRateWpm)}
            />
          )}
          <MetricCard
            icon="pause"
            label="Average pause"
            value={`${current.avgPauseSec.toFixed(2)}s`}
            baselineLabel={baselineLabelFor(baseline.averages.avgPauseSec, (v) => `${v.toFixed(2)}s`)}
            sparkline={sparkline("avgPauseSec")}
            {...rowChange(current.avgPauseSec, baseline.averages.avgPauseSec)}
          />
          <MetricCard
            icon="count"
            label="Pause count"
            value={String(current.pauseCount)}
            baselineLabel={baselineLabelFor(baseline.averages.pauseCount, (v) => Math.round(v).toString())}
            sparkline={sparkline("pauseCount")}
            {...rowChange(current.pauseCount, baseline.averages.pauseCount)}
          />
          <MetricCard
            icon="longest"
            label="Long pauses"
            value={String(current.longPauseCount)}
            baselineLabel={baselineLabelFor(
              baseline.averages.longPauseCount,
              (v) => Math.round(v).toString()
            )}
            sparkline={sparkline("longPauseCount")}
            {...rowChange(current.longPauseCount, baseline.averages.longPauseCount)}
          />
          <MetricCard
            icon="longest"
            label="Longest pause"
            value={`${current.longestPauseSec.toFixed(2)}s`}
            baselineLabel={baselineLabelFor(
              baseline.averages.longestPauseSec,
              (v) => `${v.toFixed(2)}s`
            )}
            sparkline={sparkline("longestPauseSec")}
            {...rowChange(current.longestPauseSec, baseline.averages.longestPauseSec)}
          />
          <MetricCard
            icon="silence"
            label="Silence"
            value={`${Math.round(current.silencePercent)}%`}
            baselineLabel={baselineLabelFor(
              baseline.averages.silencePercent,
              (v) => `${Math.round(v)}%`
            )}
            sparkline={sparkline("silencePercent")}
            {...rowChange(current.silencePercent, baseline.averages.silencePercent)}
          />
          <MetricCard
            icon="latency"
            label="Response time"
            value={`${current.speechOnsetSec.toFixed(2)}s`}
            baselineLabel={baselineLabelFor(
              baseline.averages.speechOnsetSec,
              (v) => `${v.toFixed(2)}s`
            )}
            sparkline={sparkline("speechOnsetSec")}
            {...rowChange(current.speechOnsetSec, baseline.averages.speechOnsetSec)}
          />
        </CategorySection>
      )}

      {current.transcriptAvailable && hasFluencyMetrics && fluencyScore && (
        <CategorySection categoryScore={fluencyScore}>
          {current.fillerPerMin !== null && (
            <MetricCard
              icon="filler"
              label="Filler words"
              value={`${current.fillerPerMin.toFixed(1)}/min`}
              baselineLabel={baselineLabelFor(
                baseline.averages.fillerPerMin,
                (v) => `${v.toFixed(1)}/min`
              )}
              sparkline={sparkline("fillerPerMin")}
              {...rowChange(current.fillerPerMin, baseline.averages.fillerPerMin)}
            />
          )}
          {current.repeatedWords !== null && (
            <MetricCard
              icon="repeat"
              label="Repeated words"
              value={String(current.repeatedWords)}
              baselineLabel={baselineLabelFor(
                baseline.averages.repeatedWords,
                (v) => Math.round(v).toString()
              )}
              sparkline={sparkline("repeatedWords")}
              {...rowChange(current.repeatedWords, baseline.averages.repeatedWords)}
            />
          )}
          {current.lexicalDiversity !== null && (
            <MetricCard
              icon="variety"
              label="Word variety"
              value={`${Math.round(current.lexicalDiversity * 100)}%`}
              baselineLabel={baselineLabelFor(
                baseline.averages.lexicalDiversity,
                (v) => `${Math.round(v * 100)}%`
              )}
              sparkline={sparkline("lexicalDiversity").map((v) => v * 100)}
              {...rowChange(current.lexicalDiversity, baseline.averages.lexicalDiversity)}
            />
          )}
        </CategorySection>
      )}

      {hasVoiceMetrics && voiceScore && (
        <CategorySection categoryScore={voiceScore}>
          {current.avgPitchHz !== null && (
            <MetricCard
              icon="pitchAvg"
              label="Average pitch"
              value={`${Math.round(current.avgPitchHz)} Hz`}
              baselineLabel={baselineLabelFor(
                baseline.averages.avgPitchHz,
                (v) => `${Math.round(v)} Hz`
              )}
              sparkline={sparkline("avgPitchHz")}
              {...rowChange(current.avgPitchHz, baseline.averages.avgPitchHz)}
            />
          )}
          {current.pitchVariation !== null && (
            <MetricCard
              icon="pitch"
              label="Pitch variation"
              value={`${Math.round(current.pitchVariation)}%`}
              baselineLabel={baselineLabelFor(
                baseline.averages.pitchVariation,
                (v) => `${Math.round(v)}%`
              )}
              sparkline={sparkline("pitchVariation")}
              {...rowChange(current.pitchVariation, baseline.averages.pitchVariation)}
            />
          )}
          {current.pitchRangeHz !== null && (
            <MetricCard
              icon="range"
              label="Pitch range"
              value={`${Math.round(current.pitchRangeHz)} Hz`}
              baselineLabel={baselineLabelFor(
                baseline.averages.pitchRangeHz,
                (v) => `${Math.round(v)} Hz`
              )}
              sparkline={sparkline("pitchRangeHz")}
              {...rowChange(current.pitchRangeHz, baseline.averages.pitchRangeHz)}
            />
          )}
          {current.vocalEnergy !== null && (
            <MetricCard
              icon="energy"
              label="Vocal energy"
              value={current.vocalEnergy.toFixed(1)}
              baselineLabel={baselineLabelFor(
                baseline.averages.vocalEnergy,
                (v) => v.toFixed(1)
              )}
              sparkline={sparkline("vocalEnergy")}
              {...rowChange(current.vocalEnergy, baseline.averages.vocalEnergy)}
            />
          )}
          {current.vocalEnergyVariation !== null && (
            <MetricCard
              icon="variability"
              label="Energy variability"
              value={`${Math.round(current.vocalEnergyVariation)}%`}
              baselineLabel={baselineLabelFor(
                baseline.averages.vocalEnergyVariation,
                (v) => `${Math.round(v)}%`
              )}
              sparkline={sparkline("vocalEnergyVariation")}
              {...rowChange(current.vocalEnergyVariation, baseline.averages.vocalEnergyVariation)}
            />
          )}
        </CategorySection>
      )}

      {!current.transcriptAvailable && (
        <p className="text-center text-xs text-muted -mt-4">
          Transcript-based features (pace, filler words, word variety) are unavailable.
          No speech recognition was available for this recording. Acoustic features are shown above.
        </p>
      )}

      {!hasVoiceMetrics && (
        <p className="text-center text-xs text-muted -mt-4">
          Pitch and vocal energy weren&apos;t detected clearly enough in this recording to show.
          Try speaking a little closer to the mic.
        </p>
      )}

      <div className="flex justify-center gap-3">
        <Button size="md" onClick={onRecordAgain}>
          Record again
        </Button>
        <ShareCardButton
          data={{
            score: enoughForComparisons ? stability.score : null,
            scoreLabel:
              enoughForComparisons && stability.score !== null
                ? scoreLabel(stability.score)
                : "Building your baseline",
            wordCount: totalWordsSpoken,
            wpm: current.wpm,
            recordingCount: history.length,
          }}
        />
      </div>

      <div className="border-t border-border pt-8">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-medium text-muted uppercase tracking-wide">History</h3>
          <span className="text-xs text-muted">
            {history.length} recording{history.length === 1 ? "" : "s"} saved
          </span>
        </div>

        {recentHistory.length >= 2 ? (
          <>
            <div className="mb-4">
              <HistoryChart
                points={recentHistory.map((r, i) => ({
                  label: formatDay(r.timestamp, i, recentHistory.length),
                  score: r.stabilityScore,
                }))}
              />
            </div>
            <ul className="divide-y divide-border">
              {[...recentHistory].reverse().map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted">
                    {formatDay(r.timestamp, recentHistory.length - 1 - i, recentHistory.length)}
                  </span>
                  <span className="font-medium">
                    {r.stabilityScore !== null ? r.stabilityScore : "Building"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm text-muted">
              Record a few more times and a trend line will show up here, tracking your Voice
              Stability over time.
            </p>
          </div>
        )}

        <button
          onClick={onClearData}
          className="mt-6 text-xs text-muted underline underline-offset-2 hover:text-foreground"
        >
          Clear demo data
        </button>
      </div>

      <CognitiveHealthNote flag={cognitiveFlag} />

      <p className="text-center text-xs text-muted max-w-md mx-auto">
        This is an experimental speech-pattern screening demo, not a medical diagnosis.
      </p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface ring-1 ring-border px-3 py-2.5 text-center">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}
