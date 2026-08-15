export default function CognitiveHealthNote() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Why we track this</p>
      <p className="text-sm leading-relaxed text-foreground">
        Researchers have studied links between changes in speech, things like longer pauses,
        slower talking, or trouble finding words, and brain health, including conditions like
        dementia and Parkinson&apos;s. That&apos;s part of why Sona tracks pacing and pauses
        alongside pitch and word choice.
      </p>
      <p className="text-sm leading-relaxed text-muted">
        Sona is not a medical device and can&apos;t tell you whether you have any condition. A
        change in your score can come from being tired, sick, stressed, or just a bad mic day.
        If you&apos;re ever genuinely concerned about your memory or thinking, please talk to a
        doctor. That&apos;s the only reliable way to check.
      </p>
    </div>
  );
}
