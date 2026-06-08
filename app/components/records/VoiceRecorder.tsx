"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
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

function MicButtonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 text-[var(--color-bg)]" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

export function VoiceRecorder() {
  const router = useRouter();
  const [state, setState] = useState<RecorderState>("idle");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<CachedVoiceText | null>(null);
  const [showCacheOptions, setShowCacheOptions] = useState(false);
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
    // Safari全般（iPhone・iPad・macOS）はmimeType指定でエラーになるためスキップ
    // Chrome/Firefox/Edgeは識別子にSafariも含むため、それらを除外してSafariのみ検出
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/Chrome|CriOS|FxiOS|EdgA|OPR/.test(navigator.userAgent);
    // iPadOS 13+ はデスクトップモードでMacintoshと表示されるため別途検出
    const isIPadOS =
      /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;

    if (isSafari || isIPadOS) return "";

    const candidates = [
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
    setShowCacheOptions(false);
  };

  const startRecording = async () => {
    setError(null);
    setShowCacheOptions(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mimeTypeRef.current = mimeType || "audio/webm";
      } catch {
        // iPhone Safari など mimeType 指定で失敗する場合はデフォルトで再試行
        recorder = new MediaRecorder(stream);
        mimeTypeRef.current = recorder.mimeType || "audio/mp4";
      }

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("マイクの使用が許可されていません。設定から許可してください。");
      } else {
        setError("録音を開始できませんでした。ページを再読み込みしてもう一度お試しください。");
      }
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

  const hasCache = state === "idle" && cached && !isProcessing;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-sub)] p-4">
        <p className="mb-3 text-center text-sm font-bold text-[var(--color-text)]">
          この順番で話すと精度が上がります
        </p>
        <ol className="space-y-2 text-sm">
          {[
            { label: "対局形式", example: "例）棋の音香落ち下手、将棋ウォーズ10切れ" },
            { label: "相手の段位・級位", example: "例）棋の音の初段" },
            { label: "戦型", example: "例）私は左美濃、相手は持久戦矢倉" },
            { label: "問題局面までの流れ", example: "大まかな経緯" },
            { label: "局面での判断とその理由", example: "" },
            { label: "敗因・疑問手だった理由", example: "" },
            { label: "最善手・改善手とその理由", example: "" },
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="min-w-[1.5rem] font-bold text-[var(--color-primary)]">
                {i + 1}.
              </span>
              <span>
                <span className="font-medium text-[var(--color-text)]">{item.label}</span>
                {item.example && (
                  <span className="block text-xs text-[var(--color-text-sub)]">{item.example}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {hasCache && (
        <p className="text-center text-xs font-medium text-[var(--color-primary)]">
          下のマイクをタップして、新しい対局を録音できます
        </p>
      )}

      <button
        type="button"
        onClick={handleMicClick}
        disabled={isProcessing}
        aria-label={state === "recording" ? "録音を停止" : "新しい対局を録音"}
        className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all ${
          state === "recording"
            ? "animate-pulse bg-[var(--color-danger)]"
            : isProcessing
              ? "bg-[var(--color-text-sub)]"
              : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
        }`}
      >
        <MicButtonIcon />
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
        <div className="w-full max-w-sm rounded-lg bg-[var(--color-surface)] p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {state === "idle" && !error && (
        <p className="text-center text-xs text-[var(--color-text-sub)]">
          録音後は文字起こし→将棋用語補正→要約の順で処理します。
        </p>
      )}

      {hasCache && (
        <section className="w-full max-w-sm rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3">
          <button
            type="button"
            onClick={() => setShowCacheOptions((v) => !v)}
            className="flex w-full items-center justify-between text-left text-xs text-[var(--color-text-sub)]"
          >
            <span>前の対局の下書き（{formatCacheDate(cached.savedAt)}）</span>
            <span>{showCacheOptions ? "閉じる" : "開く"}</span>
          </button>
          {showCacheOptions && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
                {transcriptPreview(cached.transcript)}
              </p>
              {cached.draft ? (
                <Button variant="secondary" fullWidth onClick={handleOpenCachedDraft}>
                  下書きの要約を開く
                </Button>
              ) : null}
              <Button
                variant="secondary"
                fullWidth
                onClick={handleUseCachedTranscript}
              >
                文字起こしから要約を作る
              </Button>
              <button
                type="button"
                onClick={handleClearCache}
                className="text-xs text-[var(--color-text-sub)] underline"
              >
                下書きを削除
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
