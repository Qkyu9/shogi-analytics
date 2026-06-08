type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string };
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  readonly error: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

export function isLiveSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export type LiveSpeechSession = {
  start: () => void;
  stop: () => void;
};

/** ブラウザ組み込みの音声認識で、話している最中にテキストを返す（表示専用） */
export function createLiveSpeechSession(
  onTextUpdate: (text: string, isInterim: boolean) => void,
  shouldKeepRunning: () => boolean
): LiveSpeechSession | null {
  if (typeof window === "undefined") return null;

  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  const SpeechRecognitionCtor =
    w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;

  let stopped = false;

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results.item(i);
      const piece = result.item(0)?.transcript ?? "";
      if (result.isFinal) finalText += piece;
      else interim += piece;
    }
    const combined = `${finalText}${interim}`.trim();
    if (!combined) return;
    onTextUpdate(combined, interim.length > 0);
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-available") {
      stopped = true;
    }
  };

  recognition.onend = () => {
    if (stopped || !shouldKeepRunning()) return;
    try {
      recognition.start();
    } catch {
      /* 連続認識の再開に失敗した場合は Whisper 側に任せる */
    }
  };

  return {
    start: () => {
      stopped = false;
      try {
        recognition.start();
      } catch {
        /* MediaRecorder と競合する端末では無視 */
      }
    },
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
