interface HistoryChartProps {
  points: { label: string; score: number | null }[];
}

export default function HistoryChart({ points }: HistoryChartProps) {
  const valid = points.filter((p): p is { label: string; score: number } => p.score !== null);
  if (valid.length < 2) {
    return (
      <p className="text-sm text-muted">
        A trend line will appear once you have a few scored recordings.
      </p>
    );
  }

  const width = 600;
  const height = 140;
  const padding = 16;
  const min = Math.min(...valid.map((p) => p.score), 50);
  const max = Math.max(...valid.map((p) => p.score), 100);
  const range = Math.max(max - min, 1);

  const stepX = (width - padding * 2) / (valid.length - 1);
  const coords = valid.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((p.score - min) / range) * (height - padding * 2);
    return { x, y, score: p.score };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - padding} L${coords[0].x},${
    height - padding
  } Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" preserveAspectRatio="none">
      <defs>
        <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d5ce6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#6d5ce6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#historyFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#6d5ce6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="7 6"
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#6d5ce6" stroke="#fff" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
