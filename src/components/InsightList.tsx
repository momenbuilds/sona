interface InsightListProps {
  insights: string[];
}

export default function InsightList({ insights }: InsightListProps) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl bg-accent-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">
        What changed?
      </p>
      <ul className="flex flex-col gap-2.5">
        {insights.map((text, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
