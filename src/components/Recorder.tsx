"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import Button from "./Button";
import { LiveTranscriber, isSpeechRecognitionSupported } from "@/lib/speechRecognition";
import { randomPrompt } from "@/lib/prompts";

interface RecorderProps {
  onAnalyze: (blob: Blob, liveTranscript: string | null) => void;
  analyzing: boolean;
  takeIndex: number;
  takeTotal: number;
}

type RecState = "idle" | "recording" | "reviewing";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Recorder({ onAnalyze, analyzing, takeIndex, takeTotal }: RecorderProps) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const liveTranscriptRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAnalyser(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setAnalyser(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setState("reviewing");
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      if (isSpeechRecognitionSupported()) {
        const transcriber = new LiveTranscriber();
        transcriber.start();
        transcriberRef.current = transcriber;
      }

      setPrompt(randomPrompt());
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch {
      setError("Microphone access is needed to record. Please allow access in your browser.");
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    liveTranscriptRef.current = transcriberRef.current?.stop() ?? null;
    mediaRecorderRef.current?.stop();
  }, []);

  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    liveTranscriptRef.current = null;
    setState("idle");
  }, [audioUrl]);

  const handleAnalyze = useCallback(() => {
    if (blobRef.current) {
      onAnalyze(blobRef.current, liveTranscriptRef.current);
    }
  }, [onAnalyze]);

  const targetSec = 75;
  const progress = Math.min(1, elapsed / targetSec);
  const ringCircumference = 2 * Math.PI * 44;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: takeTotal }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i + 1 === takeIndex ? "w-6 bg-accent" : i + 1 < takeIndex ? "w-1.5 bg-accent/40" : "w-1.5 bg-border"
            }`}
          />
        ))}
        <span className="ml-2 text-xs font-medium text-muted">
          Recording {takeIndex} of {takeTotal}
        </span>
      </div>

      {state === "idle" && (
        <div className="flex flex-col items-center gap-8 animate-fade-in-up">
          <p className="text-sm text-muted">Talk naturally for 60–90 seconds.</p>
          <button
            onClick={startRecording}
            className="group relative flex h-28 w-28 items-center justify-center rounded-full text-white transition hover:scale-105 hover:brightness-[1.08] active:scale-95"
            style={{
              background: "linear-gradient(180deg, #f4823f 0%, #f2601f 100%)",
              boxShadow: "0 6px 0 0 #c94c15, 0 16px 28px -6px rgba(242,96,31,0.5)",
            }}
            aria-label="Start recording"
          >
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-accent/40" />
            <span
              className="animate-pulse-ring absolute inset-0 rounded-full bg-accent/40"
              style={{ animationDelay: "1.1s" }}
            />
            <MicIcon className="relative h-10 w-10" />
          </button>
          {error && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={startRecording}
                className="text-sm font-medium text-accent underline underline-offset-2 hover:text-accent/80"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {state === "recording" && (
        <div className="w-full flex flex-col items-center gap-6 animate-fade-in-up">
          {prompt && (
            <div className="flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm text-accent">
              <QuoteIcon className="h-3.5 w-3.5 shrink-0" />
              {prompt}
            </div>
          )}
          <div className="w-full rounded-2xl bg-surface ring-1 ring-border p-4">
            <Waveform analyser={analyser} active={state === "recording"} />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <div className="text-4xl font-semibold tabular-nums tracking-tight">
              {formatTime(elapsed)}
            </div>
          </div>
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90 pointer-events-none">
              <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <button
              onClick={stopRecording}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25 transition hover:scale-105 active:scale-95"
              aria-label="Stop recording"
            >
              <StopIcon className="h-7 w-7" />
            </button>
          </div>
          <p className="text-xs text-muted">Recording, tap to stop</p>
        </div>
      )}

      {state === "reviewing" && audioUrl && (
        <div className="w-full flex flex-col items-center gap-6 animate-fade-in-up">
          <p className="text-sm text-muted">
            {formatTime(elapsed)} recorded. Listen back, or continue to analysis.
          </p>
          <div className="w-full rounded-2xl bg-surface ring-1 ring-border p-3">
            <audio controls src={audioUrl} className="w-full" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={reRecord}
              disabled={analyzing}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-surface disabled:opacity-50"
            >
              Re-record
            </button>
            <Button size="md" onClick={handleAnalyze} disabled={analyzing} className="disabled:opacity-60">
              {analyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 11.5a7 7 0 0 1-14 0M12 18.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.5 6C5 6 3 8.2 3 11c0 2.5 1.8 4.5 4 4.5.3 0 .6 0 .8-.1C7.2 17.5 5.8 19 4 19.5l.6 1.3c3.4-.7 5.9-3.6 5.9-7.3V11c0-2.8-1.4-5-3-5Zm10 0c-2.5 0-4.5 2.2-4.5 5 0 2.5 1.8 4.5 4 4.5.3 0 .6 0 .8-.1-.6 2.1-2 3.6-3.8 4.1l.6 1.3c3.4-.7 5.9-3.6 5.9-7.3V11c0-2.8-1.4-5-3-5Z" />
    </svg>
  );
}
