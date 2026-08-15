import Button from "./Button";

interface TakeCompleteProps {
  takeIndex: number;
  takeTotal: number;
  score: number | null;
  onContinue: () => void;
}

export default function TakeComplete({ takeIndex, takeTotal, score, onContinue }: TakeCompleteProps) {
  const nextIndex = takeIndex + 1;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 text-center animate-fade-in-up">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckIcon className="h-7 w-7" />
      </span>

      <div>
        <p className="text-lg font-semibold tracking-tight">
          Recording {takeIndex} of {takeTotal} captured
        </p>
        {score !== null ? (
          <p className="mt-2 text-sm text-muted">
            Compared with your first recording, Voice Stability is{" "}
            <span className="font-semibold text-foreground">{score}</span>. Do one more so Sona
            has a fuller picture.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            One more recording and Sona can start comparing your speech patterns.
          </p>
        )}
      </div>

      <Button size="md" onClick={onContinue}>
        Continue: Recording {nextIndex} of {takeTotal}
      </Button>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
