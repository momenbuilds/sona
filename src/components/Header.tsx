"use client";

import { useState } from "react";
import Button from "./Button";

interface HeaderProps {
  onHome: () => void;
  onStart: () => void;
  showNav: boolean;
}

export default function Header({ onHome, onStart, showNav }: HeaderProps) {
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex flex-col items-center">
      {!announcementDismissed && (
        <div className="relative flex w-full items-center justify-center bg-accent px-10 py-2 text-center text-xs sm:text-sm font-medium text-white">
          <span>
            Introducing <strong className="font-semibold">Sona</strong>, voice pattern tracking
            that runs entirely in your browser.
          </span>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-4 flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition hover:text-white"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="w-full flex justify-center px-4 py-3">
        <header
          className="flex items-center gap-3 rounded-full pl-3.5 pr-1.5 py-1.5"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.5))",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow:
              "0 1px 1px rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(255,255,255,0.45) inset, 0 8px 20px rgba(31,25,64,0.1)",
          }}
        >
          <button
            onClick={onHome}
            className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Sona
          </button>

          {showNav && (
            <Button size="md" onClick={onStart} className="!px-4 !py-1.5 !text-xs">
              Start recording
            </Button>
          )}
        </header>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
