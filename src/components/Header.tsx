import Button from "./Button";

interface HeaderProps {
  onHome: () => void;
  onStart: () => void;
  showNav: boolean;
}

export default function Header({ onHome, onStart, showNav }: HeaderProps) {
  return (
    <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <header
        className="flex items-center gap-3 sm:gap-8 rounded-full pl-4 pr-2 py-2 sm:pl-6 sm:pr-2.5 sm:py-2.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.5))",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow:
            "0 1px 1px rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(255,255,255,0.45) inset, 0 12px 30px rgba(31,25,64,0.12)",
        }}
      >
        <button
          onClick={onHome}
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground shrink-0"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="hidden sm:inline">Sona</span>
        </button>

        {showNav && (
          <Button size="md" onClick={onStart}>
            Start recording
          </Button>
        )}
      </header>
    </div>
  );
}
