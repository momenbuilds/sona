import { useId } from "react";

export type MetricIcon =
  | "pace"
  | "articulation"
  | "pause"
  | "count"
  | "longest"
  | "latency"
  | "filler"
  | "repeat"
  | "silence"
  | "pitch"
  | "pitchAvg"
  | "range"
  | "energy"
  | "variability"
  | "variety";

interface MetricCardProps {
  label: string;
  value: string;
  icon: MetricIcon;
  baselineLabel?: string;
  changeLabel?: string;
  changeDirection?: "up" | "down" | "flat";
  sparkline?: number[];
}

export default function MetricCard({
  label,
  value,
  icon,
  baselineLabel,
  changeLabel,
  changeDirection,
  sparkline,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border shadow-sm shadow-black/[0.03] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MetricIconGlyph icon={icon} className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted">{label}</p>
        </div>
        {changeLabel && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
              changeDirection === "up"
                ? "bg-amber-50 text-amber-700"
                : changeDirection === "down"
                ? "bg-blue-50 text-blue-700"
                : "bg-neutral-100 text-muted"
            }`}
          >
            {changeDirection === "up" ? "↑" : changeDirection === "down" ? "↓" : ""}
            {changeLabel}
          </span>
        )}
      </div>

      <div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        {baselineLabel && <p className="mt-1 text-xs text-muted/80">{baselineLabel}</p>}
      </div>

      {sparkline && sparkline.length >= 3 && <Sparkline values={sparkline} />}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 240;
  const height = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const gradientId = useId();

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d5ce6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6d5ce6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke="#6d5ce6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="#6d5ce6" />
    </svg>
  );
}

function MetricIconGlyph({ icon, className }: { icon: MetricIcon; className?: string }) {
  switch (icon) {
    case "pace":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 3v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 16l3.5-3.5a2 2 0 1 1 1.5 1.5L8.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "articulation":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 12h3l2-6 4 12 2-6h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pause":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </svg>
      );
    case "count":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 9h14M5 15h14M9 4 7 20M17 4l-2 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "longest":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M8 2h8M8 22h8M8 2c0 4.5 2 5.5 4 7 2-1.5 4-2.5 4-7M8 22c0-4.5 2-5.5 4-7 2 1.5 4 2.5 4 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "latency":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 9v4l3 2M9 2h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "filler":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.4-4 8-9 8-1.3 0-2.6-.2-3.7-.7L3 20l1.1-3.7C3.4 15 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "repeat":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M17 2 21 6l-4 4M21 6H8a5 5 0 0 0-5 5v1M7 22 3 18l4-4M3 18h13a5 5 0 0 0 5-5v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "silence":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
          <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
        </svg>
      );
    case "pitch":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 14c2-6 4-9 6-9s4 12 6 12 4-3 6-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pitchAvg":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "range":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "energy":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" />
        </svg>
      );
    case "variability":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 17c2-8 3 8 5-2s3 6 5-4 3 6 5-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "variety":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="7" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="17" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}
