import { PopulationResult, buildPopulationInsights } from "@/lib/population";
import { REFERENCE_META, REFERENCE_STATS, PopulationMetricKey } from "@/lib/referenceStats";
import CategorySection from "./CategorySection";
import MetricCard, { MetricIcon } from "./MetricCard";

interface PopulationSectionProps {
  result: PopulationResult;
}

const ICONS: Record<PopulationMetricKey, MetricIcon> = {
  wpm: "pace",
  pitchVariation: "pitch",
  vocalEnergyVariation: "variability",
};

function formatValue(key: PopulationMetricKey, value: number): string {
  switch (key) {
    case "wpm":
      return `${Math.round(value)} WPM`;
    case "pitchVariation":
    case "vocalEnergyVariation":
      return `${Math.round(value)}%`;
  }
}

function ordinalLabel(percentile: number): string {
  const rounded = Math.round(percentile);
  const rem100 = rounded % 100;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : rounded % 10 === 1
      ? "st"
      : rounded % 10 === 2
      ? "nd"
      : rounded % 10 === 3
      ? "rd"
      : "th";
  return `${rounded}${suffix} pctile`;
}

export default function PopulationSection({ result }: PopulationSectionProps) {
  if (result.notes.length === 0) return null;

  const insights = buildPopulationInsights(result.notes);

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface ring-1 ring-border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
          Compared to general speech
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">
          This is a separate, experimental comparison against a small reference sample of{" "}
          <strong>{REFERENCE_META.style}</strong> ({REFERENCE_META.corpus}, {REFERENCE_META.clipCount}{" "}
          clips from {REFERENCE_META.speakerCount} speakers, {REFERENCE_META.license}) — not people
          talking casually like you did here. Short scripted single sentences don&apos;t contain
          natural pauses or filler words, so only speaking pace and voice-variability measures are
          compared this way; pauses, fillers, and word variety are only ever compared to your own
          history above. There is no single &ldquo;typical&rdquo; score here on purpose — being
          unusually expressive and unusually flat are both just &ldquo;different from the
          median,&rdquo; not good or bad. This is a statistical comparison, not a measure of
          cognitive health, dementia risk, or any clinical marker.
        </p>
      </div>

      <CategorySection
        categoryScore={{ label: "General speech comparison", score: null, status: "Reference sample" }}
      >
        {result.notes.map((note) => (
          <MetricCard
            key={note.key}
            icon={ICONS[note.key]}
            label={note.label}
            value={formatValue(note.key, note.current)}
            baselineLabel={`Reference median ~${formatValue(note.key, REFERENCE_STATS[note.key].p50)}`}
            changeLabel={ordinalLabel(note.percentile)}
            changeDirection={note.direction}
          />
        ))}
      </CategorySection>

      {insights.length > 0 && (
        <ul className="flex flex-col gap-1.5 px-1">
          {insights.map((text, i) => (
            <li key={i} className="text-xs text-muted">
              {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
