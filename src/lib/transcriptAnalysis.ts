export interface TranscriptFeatures {
  wordCount: number;
  wpm: number;
  fillerCount: number;
  fillerPerMin: number;
  repeatedWords: number;
  lexicalDiversity: number;
}

const FILLER_WORDS = new Set([
  "um",
  "umm",
  "uh",
  "uhh",
  "er",
  "erm",
  "hmm",
  "huh",
]);

function tokenize(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function analyzeTranscript(transcript: string, durationSec: number): TranscriptFeatures {
  const words = tokenize(transcript);
  const wordCount = words.length;
  const minutes = Math.max(durationSec / 60, 1 / 60);

  const fillerCount = words.filter((w) => FILLER_WORDS.has(w)).length;
  const fillerPerMin = fillerCount / minutes;

  let repeatedWords = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) repeatedWords++;
  }

  const uniqueWords = new Set(words.filter((w) => !FILLER_WORDS.has(w)));
  const contentWordCount = words.filter((w) => !FILLER_WORDS.has(w)).length;
  const lexicalDiversity = contentWordCount > 0 ? uniqueWords.size / contentWordCount : 0;

  const wpm = wordCount / minutes;

  return {
    wordCount,
    wpm,
    fillerCount,
    fillerPerMin,
    repeatedWords,
    lexicalDiversity,
  };
}
