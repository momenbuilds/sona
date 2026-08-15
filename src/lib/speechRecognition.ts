// Thin wrapper around the browser's Web Speech API (SpeechRecognition).
// Used as a free, client-side transcript source when no server transcription
// API key is configured (or when the server call fails).

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class LiveTranscriber {
  private recognition: SpeechRecognitionLike | null = null;
  private finalText = "";
  private interimText = "";

  start(): boolean {
    if (!isSpeechRecognitionSupported()) return false;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          this.finalText += text + " ";
        } else {
          interim += text;
        }
      }
      this.interimText = interim;
    };

    recognition.onerror = () => {
      // Swallow errors (e.g. no-speech, network) — we fall back to
      // whatever transcript text has been captured so far.
    };

    try {
      recognition.start();
      this.recognition = recognition;
      return true;
    } catch {
      return false;
    }
  }

  stop(): string {
    this.recognition?.stop();
    return this.getTranscript();
  }

  getTranscript(): string {
    return (this.finalText + " " + this.interimText).trim();
  }
}
