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
  private stopped = false;

  start(): boolean {
    if (!isSpeechRecognitionSupported()) return false;
    if (!this.createAndStart()) return false;
    this.stopped = false;
    return true;
  }

  private createAndStart(): boolean {
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
      // Swallow errors (e.g. no-speech, network) — onend fires right after
      // and restarts recognition below, so a transient error just resets it.
    };

    // Chrome's SpeechRecognition doesn't stay open for a full 60-90s take:
    // it ends on its own after a stretch of silence or a fixed timeout,
    // even with continuous set. Without restarting here, most of a take
    // gets silently dropped and the transcript comes back empty. So keep
    // relaunching a fresh instance until stop() is called deliberately.
    recognition.onend = () => {
      if (this.stopped) return;
      this.createAndStart();
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
    this.stopped = true;
    this.recognition?.stop();
    return this.getTranscript();
  }

  getTranscript(): string {
    return (this.finalText + " " + this.interimText).trim();
  }
}
