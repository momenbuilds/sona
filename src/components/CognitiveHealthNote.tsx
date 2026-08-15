import { CognitiveFlag } from "@/lib/score";

interface CognitiveHealthNoteProps {
  flag: CognitiveFlag | null;
}

export default function CognitiveHealthNote({ flag }: CognitiveHealthNoteProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Why we track this</p>
      <p className="text-sm leading-relaxed text-foreground">
        Researchers have studied links between changes in speech, things like longer pauses,
        slower talking, or trouble finding words, and brain health, including conditions like
        dementia and Parkinson&apos;s. That&apos;s part of why Sona tracks pacing and pauses
        alongside pitch and word choice.
      </p>

      {flag && (
        <div
          className={`rounded-xl p-4 text-sm leading-relaxed ${
            flag.flagged ? "bg-accent-soft text-foreground" : "bg-neutral-50 text-muted"
          }`}
        >
          {flag.flagged ? (
            <>
              <p className="font-medium text-foreground mb-1">
                A few things worth mentioning to a doctor
              </p>
              <p>
                Across your recordings, a trend showed up: {formatList(flag.matchedLabels)}. This
                isn&apos;t a diagnosis and isn&apos;t guaranteed to mean anything, plenty of
                things (stress, tiredness, illness, a bad mic) can cause the same pattern. But if
                you&apos;re noticing it yourself too, it&apos;s worth bringing up with a doctor.
              </p>
            </>
          ) : (
            <p>No sustained trend across your recordings so far. Keep recording over time, that&apos;s more useful than any single session.</p>
          )}
        </div>
      )}

      <p className="text-sm leading-relaxed text-muted">
        Sona is not a medical device and can&apos;t tell you whether you have any condition, with
        or without this trend check. If you&apos;re ever genuinely concerned about your memory or
        thinking, please talk to a doctor. That&apos;s the only reliable way to check.
      </p>
    </div>
  );
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
