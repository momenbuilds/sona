interface AnalysisSummaryProps {
  text: string;
}

export default function AnalysisSummary({ text }: AnalysisSummaryProps) {
  if (!text) return null;

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Analysis</p>
      <p className="text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
