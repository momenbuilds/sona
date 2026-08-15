interface StabilityGaugeProps {
  score: number | null;
  label: string;
  baselineCount?: number;
  baselineTarget?: number;
}

export default function StabilityGauge({
  score,
  label,
  baselineCount = 0,
  baselineTarget = 1,
}: StabilityGaugeProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const building = score === null;
  const pct = building
    ? Math.min(1, baselineCount / baselineTarget)
    : score / 100;
  const offset = circumference * (1 - pct);
  const remaining = Math.max(0, baselineTarget - baselineCount);

  return (
    <div className="w-full rounded-3xl bg-surface ring-1 ring-border shadow-sm shadow-black/[0.03] px-8 py-10 flex flex-col items-center gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Voice Stability
      </p>
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-[#efeadf]"
          />
          {pct > 0 && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={building ? "#f8c9a0" : "url(#gaugeGradient)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          )}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f2601f" />
              <stop offset="100%" stopColor="#f4a05f" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {building ? (
            <>
              <MicWaitIcon className="h-9 w-9 text-accent/70" />
              <span className="text-xs text-muted mt-1.5">Waiting for take 2</span>
            </>
          ) : (
            <span className="text-5xl font-semibold tracking-tight">{score}</span>
          )}
        </div>
      </div>

      {building ? (
        <div className="flex flex-col items-center gap-3">
          {baselineTarget > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: baselineTarget }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i < baselineCount ? "w-6 bg-accent" : "w-3 bg-border"
                  }`}
                />
              ))}
            </div>
          )}
          <p className="text-sm text-muted text-center max-w-xs">
            {remaining <= 1
              ? "Record once more and Sona will compare it with this one."
              : `${remaining} more recordings to build your personal baseline.`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted text-center max-w-xs">{label}</p>
      )}
    </div>
  );
}

function MicWaitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19 11.5a7 7 0 0 1-14 0M12 18.5v2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
