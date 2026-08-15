import { analyzeAcoustics, decodeAudio } from "./audioAnalysis";
import { analyzeTranscript } from "./transcriptAnalysis";
import { RecordingMetrics } from "./types";

export async function fetchServerTranscript(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function buildMetrics(
  blob: Blob,
  liveTranscript: string | null
): Promise<RecordingMetrics> {
  const buffer = await decodeAudio(blob);
  const acoustics = analyzeAcoustics(buffer);

  // Prefer a server (Whisper) transcript when available; otherwise fall
  // back to whatever the browser's live SpeechRecognition captured.
  const serverTranscript = await fetchServerTranscript(blob);
  const transcript = serverTranscript || liveTranscript || "";
  const transcriptAvailable = transcript.trim().length > 0;

  const t = transcriptAvailable ? analyzeTranscript(transcript, acoustics.durationSec) : null;

  // Pace while actually talking, excluding pauses — distinct from raw WPM.
  const articulationRateWpm =
    t && acoustics.speakingSec > 0 ? t.wordCount / (acoustics.speakingSec / 60) : null;

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),

    durationSec: acoustics.durationSec,
    wpm: t?.wpm ?? null,
    articulationRateWpm,
    pauseCount: acoustics.pauseCount,
    longPauseCount: acoustics.longPauseCount,
    avgPauseSec: acoustics.avgPauseSec,
    longestPauseSec: acoustics.longestPauseSec,
    silencePercent: acoustics.silencePercent,
    speechOnsetSec: acoustics.speechOnsetSec,

    wordCount: t?.wordCount ?? null,
    fillerCount: t?.fillerCount ?? null,
    fillerPerMin: t?.fillerPerMin ?? null,
    repeatedWords: t?.repeatedWords ?? null,
    lexicalDiversity: t?.lexicalDiversity ?? null,

    avgPitchHz: acoustics.avgPitchHz,
    pitchVariation: acoustics.pitchVariation,
    minPitchHz: acoustics.minPitchHz,
    maxPitchHz: acoustics.maxPitchHz,
    pitchRangeHz: acoustics.pitchRangeHz,
    vocalEnergy: acoustics.vocalEnergy,
    vocalEnergyVariation: acoustics.vocalEnergyVariation,

    transcriptAvailable,
    transcript: transcriptAvailable ? transcript : undefined,

    stabilityScore: null,
  };
}
