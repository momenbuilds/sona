"use client";

import { useCallback, useState } from "react";
import Header from "@/components/Header";
import Button from "@/components/Button";
import Recorder from "@/components/Recorder";
import TakeComplete from "@/components/TakeComplete";
import ResultsView from "@/components/ResultsView";
import { buildMetrics } from "@/lib/analyze";
import { computeStability, StabilityResult } from "@/lib/score";
import {
  clearRecordings,
  computeBaseline,
  loadRecordings,
  saveRecording,
  SESSION_TAKES,
} from "@/lib/storage";
import { randomPrompt } from "@/lib/prompts";
import { Baseline, RecordingMetrics } from "@/lib/types";

type View = "landing" | "record" | "takeComplete" | "result";

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionTake, setSessionTake] = useState(1);
  const [takeScore, setTakeScore] = useState<number | null>(null);
  const [, setUsedPrompts] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [result, setResult] = useState<{
    current: RecordingMetrics;
    baseline: Baseline;
    stability: StabilityResult;
    history: RecordingMetrics[];
  } | null>(null);

  const handleAnalyze = useCallback(
    async (blob: Blob, liveTranscript: string | null) => {
      setAnalyzing(true);
      try {
        const metrics = await buildMetrics(blob, liveTranscript);
        const priorRecordings = loadRecordings();
        const baseline = computeBaseline(priorRecordings);
        const stability = computeStability(metrics, baseline);
        const finalMetrics: RecordingMetrics = {
          ...metrics,
          stabilityScore: stability.score,
        };
        const history = saveRecording(finalMetrics);

        if (sessionTake < SESSION_TAKES) {
          setTakeScore(stability.score);
          setView("takeComplete");
        } else {
          setResult({ current: finalMetrics, baseline, stability, history });
          setView("result");
        }
      } finally {
        setAnalyzing(false);
      }
    },
    [sessionTake]
  );

  const handleClearData = useCallback(() => {
    clearRecordings();
    setResult(null);
    setSessionTake(1);
    setView("landing");
  }, []);

  const handleContinueSession = useCallback(() => {
    setSessionTake((n) => n + 1);
    setUsedPrompts((used) => {
      const next = randomPrompt(used);
      setCurrentPrompt(next);
      return [...used, next];
    });
    setView("record");
  }, []);

  const handleRecordAgain = useCallback(() => {
    setResult(null);
    setSessionTake(1);
    const next = randomPrompt();
    setUsedPrompts([next]);
    setCurrentPrompt(next);
    setView("record");
  }, []);

  const goHome = useCallback(() => {
    setResult(null);
    setSessionTake(1);
    setView("landing");
  }, []);

  const startSession = useCallback(() => {
    setSessionTake(1);
    const next = randomPrompt();
    setUsedPrompts([next]);
    setCurrentPrompt(next);
    setView("record");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onHome={goHome} onStart={startSession} showNav={view === "landing"} />

      <main className="flex-1 flex flex-col">
        {view === "landing" && (
          <>
            <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 sm:px-12 lg:px-20 min-h-screen text-center">
              <HeroBackground />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hand-mic.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute -left-6 sm:left-0 bottom-0 w-[150px] sm:w-[200px] hidden sm:block"
                style={{ mixBlendMode: "multiply" }}
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bird-mascot.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute right-[4%] top-[14%] w-[220px] sm:w-[300px] rotate-[6deg]"
                style={{ mixBlendMode: "multiply" }}
              />

              <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-7 animate-fade-in-up">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
                  Voice pattern tracking
                </span>
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
                  <span className="block whitespace-nowrap">Your voice changes</span>
                  <span className="block whitespace-nowrap">
                    before you{" "}
                    <em className="text-accent" style={{ fontFamily: "var(--font-serif)" }}>
                      notice.
                    </em>
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-muted max-w-lg mx-auto">
                  Record {SESSION_TAKES} short takes back to back. Sona compares them and builds a
                  detailed picture of your speech patterns.
                </p>
                <Button onClick={startSession} size="lg" className="mt-4">
                  Start recording
                </Button>
                <p className="text-sm text-muted/80">Takes about 3 minutes. Nothing leaves your browser.</p>
              </div>
            </section>
          </>
        )}

        {view === "record" && (
          <section className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-16">
            <AmbientGlow />
            <Recorder
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
              takeIndex={sessionTake}
              takeTotal={SESSION_TAKES}
              prompt={currentPrompt}
            />
          </section>
        )}

        {view === "takeComplete" && (
          <section className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-16">
            <AmbientGlow />
            <TakeComplete
              takeIndex={sessionTake}
              takeTotal={SESSION_TAKES}
              score={takeScore}
              onContinue={handleContinueSession}
            />
          </section>
        )}

        {view === "result" && result && (
          <section className="flex-1 px-6 pt-32 pb-10">
            <ResultsView
              current={result.current}
              baseline={result.baseline}
              stability={result.stability}
              history={result.history}
              onRecordAgain={handleRecordAgain}
              onClearData={handleClearData}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div
        className="absolute left-1/2 top-[8%] h-[480px] w-[720px] -translate-x-1/2"
        style={{
          background: "radial-gradient(circle, #f2601f 0%, transparent 65%)",
          opacity: 0.1,
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute left-[75%] bottom-[5%] h-[380px] w-[560px] -translate-x-1/2"
        style={{
          background: "radial-gradient(circle, #f4a05f 0%, transparent 65%)",
          opacity: 0.08,
          filter: "blur(90px)",
        }}
      />
    </div>
  );
}

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-illustration.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "85% 30%" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--background) 100%)" }}
      />
    </div>
  );
}
