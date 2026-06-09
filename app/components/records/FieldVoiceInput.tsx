"use client";

import { useEffect, useRef, useState } from "react";
import {
  assembleRecordingBlob,
  audioBlobExtension,
  buildUploadChunks,
  getWebKitRecorderMimeType,
  IOS_TIMESLICE_MS,
  isIOSOrWebKit,
  parseJsonResponse,
} from "@/app/lib/ios-audio";
import {
  createLiveSpeechSession,
  type LiveSpeechSession,
} from "@/app/lib/live-speech-recognition";

const FIELD_MAX_DURATION_SEC = 3 * 60;

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

export function FieldVoiceInput({
  value,
  onChange,
  rows = 3,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/mp4");
  const liveSpeechRef = useRef<LiveSpeechSession | null>(null);
  const recordingActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const cleanup = () => {
    recordingActiveRef.current = false;
    liveSpeechRef.current?.stop();
    liveSpeechRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    durationRef.current = 0;
    setRecording(false);
    setLiveText("");
  };

  useEffect(() => () => cleanup(), []);

  const transcribeChunk = async (chunk: Blob): Promise<string> => {
    const ext = audioBlobExtension(chunk);
    const form = new FormData();
    form.append("audio", chunk, `field-recording.${ext}`);
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await parseJsonResponse<{ text?: string; error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error ?? "文字起こしに失敗しました。");
    }
    return data.text?.trim() ?? "";
  };

  const transcribeBlob = async (blob: Blob): Promise<string> => {
    if (blob.size === 0) return "";
    const chunks = await buildUploadChunks(blob);
    const parts: string[] = [];
    for (const chunk of chunks) {
      const text = await transcribeChunk(chunk);
      if (text) parts.push(text);
    }
    return parts.join("\n").trim();
  };

  const correctTranscript = async (raw: string): Promise<string> => {
    const res = await fetch("/api/correct-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: raw }),
    });
    const data = await parseJsonResponse<{ text?: string; error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error ?? "将棋用語の補正に失敗しました。");
    }
    return data.text?.trim() || raw;
  };

  const appendText = (newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const merged = value.trim() ? `${value.trim()}\n${trimmed}` : trimmed;
    onChange(merged);
  };

  const finishRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      return;
    }

    setProcessing(true);
    setError(null);

    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });

    try {
      const blob = await assembleRecordingBlob(
        chunksRef.current,
        mimeTypeRef.current
      );
      const raw =
        (await transcribeBlob(blob)) || liveText.trim();
      if (!raw) {
        setError("音声を認識できませんでした。もう一度お試しください。");
        return;
      }
      const corrected = await correctTranscript(raw);
      appendText(corrected);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "音声入力に失敗しました。"
      );
    } finally {
      cleanup();
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (recording || processing) return;
    setError(null);

    if (typeof MediaRecorder === "undefined") {
      setError("この端末では音声入力に対応していません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const webkit = isIOSOrWebKit();
      const mimeType = webkit ? getWebKitRecorderMimeType() : undefined;
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mimeTypeRef.current = recorder.mimeType || mimeType || "audio/mp4";
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      });

      if (webkit) {
        try {
          recorder.start(IOS_TIMESLICE_MS);
        } catch {
          recorder.start();
        }
      } else {
        recorder.start(IOS_TIMESLICE_MS);
      }

      mediaRecorderRef.current = recorder;
      recordingActiveRef.current = true;
      setRecording(true);

      liveSpeechRef.current = createLiveSpeechSession(
        (text) => setLiveText(text),
        () => recordingActiveRef.current
      );
      liveSpeechRef.current?.start();

      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (durationRef.current >= FIELD_MAX_DURATION_SEC) {
          void finishRecording();
        }
      }, 1000);
    } catch {
      cleanup();
      setError("マイクの使用が許可されていません。");
    }
  };

  const handleMicClick = () => {
    if (processing) return;
    if (recording) void finishRecording();
    else void startRecording();
  };

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="min-h-0 flex-1 rounded-lg border border-[var(--color-border)] p-2 text-sm leading-relaxed"
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={processing}
          aria-label={recording ? "録音を停止" : "音声で入力"}
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            recording
              ? "bg-[var(--color-danger)] text-white"
              : processing
                ? "bg-[var(--color-border)] text-[var(--color-text-sub)]"
                : "bg-[var(--color-primary)] text-white"
          }`}
        >
          <MicIcon />
        </button>
      </div>
      {(recording || processing) && (
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          {processing
            ? "文字起こし中..."
            : "録音中… もう一度タップで停止"}
        </p>
      )}
      {recording && liveText && (
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-sub)]">
          {liveText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
