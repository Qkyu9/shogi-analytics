"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { saveDraft } from "@/app/lib/draft-storage";
import type { GameRecordDraft } from "@/app/lib/types";
import {
  clearTranscriptCache,
  formatCacheDate,
  loadTranscriptCache,
  saveTranscriptCache,
  transcriptPreview,
  type CachedVoiceText,
} from "@/app/lib/transcript-cache";
import { formatDuration } from "@/app/lib/utils";

type RecorderState =
  | "idle"
  | "recording"
  | "transcribing"
  | "correcting"
  | "summarizing";
type ProcessingStep = "transcribing" | "correcting" | "summarizing" | null;

export function VoiceRecorder() {
  const router = useRouter();
  const [state, setState] = useState<RecorderState>("idle");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<CachedVoiceText | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    setCached(loadTranscriptCache());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pickMimeType = () => {
    const candidates = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  };

  const correctTranscript = async (raw: string) => {
    setState("correcting");
    setProcessingStep("correcting");

    const res = await fetch("/api/correct-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: raw }),
    });

    const data = (await res.json()) as {
      text?: string;
      rawText?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data.error ?? "将棋用語の補正に失敗しました。");
    }

    return {
      corrected: data.text?.trim() || raw,
      raw: data.rawText ?? raw,
    };
  };

  const summarizeTranscript = async (transcript: string, rawTranscript?: string) => {
    setState("summarizing");
    setProcessingStep("summarizing");

    const summarizeRes = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });

    const summarizeData = (await summarizeRes.json()) as {
      draft?: GameRecordDraft;
      transcript?: string;
      error?: string;
    };

    if (!summarizeRes.ok) {
      throw new Error(summarizeData.error ?? "要約の生成に失敗しました。");
    }

    if (!summarizeData.draft) {
      throw new Error("要約データを取得できませんでした。");
    }

    const finalTranscript = summarizeData.transcript ?? transcript;
    saveTranscriptCache({
      transcript: finalTranscript,
      rawTranscript,
      draft: summarizeData.draft,
    });
    setCached(loadTranscriptCache());

    saveDraft({
      draft: summarizeData.draft,
      transcript: finalTranscript,
      rawTranscript,
    });
    router.push("/records/new/preview");
  };

  const processAudio = async (blob: Blob) => {
    setState("transcribing");
    setProcessingStep("transcribing");

    const transcribeForm = new FormData();
    transcribeForm.append("audio", blob, "recording");

    const transcribeRes = await fetch("/api/transcribe", {
      method: "POST",
      body: transcribeForm,
    });

    const transcribeData = (await transcribeRes.json()) as {
      text?: string;
      error?: string;
    };

    if (!transcribeRes.ok) {
      throw new Error(transcribeData.error ?? "文字起こしに失敗しました。");
    }

    const rawTranscript = transcribeData.text?.trim();
    if (!rawTranscript) {
      throw new Error(
        "音声を認識できませんでした。もう少し大きな声ではっきり話してから、再度お試しください。"
      );
    }

    const { corrected, raw } = await correctTranscript(rawTranscript);

    saveTranscriptCache({
      transcript: corrected,
      rawTranscript: raw,
      isNewTranscript: true,
    });
    setCached(loadTranscriptCache());

    await summarizeTranscript(corrected, raw);
  };

  const handleUseCachedTranscript = async () => {
    if (!cached?.transcript) return;
    setError(null);
    try {
      const source = cached.rawTranscript ?? cached.transcript;
      const { corrected, raw } = await correctTranscript(source);
      saveTranscriptCache({ transcript: corrected, rawTranscript: raw });
      setCached(loadTranscriptCache());
      await summarizeTranscript(corrected, raw);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "処理中にエラーが発生しました。";
      setError(message);
      setState("idle");
      setProcessingStep(null);
    }
  };

  const handleOpenCachedDraft = () => {
    if (!cached?.draft || !cached.transcript) return;
    saveDraft({ draft: cached.draft, transcript: cached.transcript });
    router.push("/records/new/preview");
  };

  const handleClearCache = () => {
    clearTranscriptCache();
    setCached(null);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError("マイクの使用が許可されていません。設定から許可してください。");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current,
      });

      try {
        await processAudio(blob);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "処理中にエラーが発生しました。";
        setError(message);
        setState("idle");
        setProcessingStep(null);
      }
    };

    recorder.stop();
  };

  const handleMicClick = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  };

  const isProcessing =
    state === "transcribing" ||
    state === "correcting" ||
    state === "summarizing";

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <p className="text-center text-sm leading-relaxed text-[var(--color-text-sub)]">
        対局直後に振り返りを話してください。
        <br />
        局面の状況・相手の狙い・自分が選んだ手・正着とその理由まで、
        詳しく話すほど要約の精度が上がります。
      </p>

      <button
        type="button"
        onClick={handleMicClick}
        disabled={isProcessing}
        aria-label={state === "recording" ? "録音を停止" : "録音を開始"}
        className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white transition-colors ${
          state === "recording"
            ? "animate-pulse bg-[var(--color-danger)]"
            : isProcessing
              ? "bg-[var(--color-text-sub)]"
              : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
        }`}
      >
        🎤
      </button>

      {state === "recording" && (
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-danger)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-danger)]" />
          録音中 {formatDuration(duration)}
        </p>
      )}

      {isProcessing && (
        <div className="text-center text-sm text-[var(--color-text-sub)]">
          <p className="font-medium">
            {processingStep === "transcribing"
              ? "音声を文字起こし中..."
              : processingStep === "correcting"
                ? "将棋用語を補正中..."
                : "AIが要約を作成中..."}
          </p>
          <p className="mt-1 text-xs">30秒ほどかかることがあります</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-sm rounded-lg border border-[var(--color-danger)] bg-red-50 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {state === "idle" && cached && !isProcessing && (
        <Card className="w-full max-w-sm">
          <h2 className="text-sm font-semibold">保存済みの文字起こし</h2>
          <p className="mt-1 text-xs text-[var(--color-text-sub)]">
            {formatCacheDate(cached.savedAt)} に保存
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-sub)]">
            {transcriptPreview(cached.transcript)}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {cached.draft ? (
              <Button fullWidth onClick={handleOpenCachedDraft}>
                保存済みの要約を開く（録音不要）
              </Button>
            ) : null}
            <Button
              variant="secondary"
              fullWidth
              onClick={handleUseCachedTranscript}
            >
              文字起こしから要約を作る（録音不要）
            </Button>
            <button
              type="button"
              onClick={handleClearCache}
              className="text-xs text-[var(--color-text-sub)] underline"
            >
              保存した文字起こしを削除
            </button>
          </div>
        </Card>
      )}

      {state === "idle" && !error && (
        <p className="text-center text-xs text-[var(--color-text-sub)]">
          録音後は文字起こし→将棋用語補正→要約の順で処理します。
        </p>
      )}
    </div>
  );
}
