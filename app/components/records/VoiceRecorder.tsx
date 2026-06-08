"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { SourceInputCollapsible } from "@/app/components/records/SourceInputCollapsible";
import {
  assembleRecordingBlob,
  audioBlobExtension,
  buildUploadChunks,
  getWebKitRecorderMimeType,
  IOS_TIMESLICE_MS,
  isIOSOrWebKit,
  LIVE_FIRST_TRANSCRIBE_SEC,
  LIVE_SEGMENT_MIN_BYTES,
  LIVE_TRANSCRIBE_INTERVAL_SEC,
  parseJsonResponse,
  RECORDING_AUTO_STOP_BYTES,
  RECORDING_HEALTH_CHECK_SEC,
  totalChunkBytes,
} from "@/app/lib/ios-audio";
import { saveDraft } from "@/app/lib/draft-storage";
import type { GameRecordDraft } from "@/app/lib/types";
import {
  clearTranscriptCache,
  formatCacheDate,
  loadTranscriptCache,
  saveLiveRawTranscript,
  saveTranscriptCache,
  transcriptPreview,
  type CachedVoiceText,
} from "@/app/lib/transcript-cache";
import {
  createLiveSpeechSession,
  type LiveSpeechSession,
} from "@/app/lib/live-speech-recognition";
import { formatDuration } from "@/app/lib/utils";

type RecorderState =
  | "idle"
  | "recording"
  | "transcribing"
  | "correcting"
  | "summarizing";
type ProcessingStep = "transcribing" | "correcting" | "summarizing" | null;
type RecordingSignal = "checking" | "receiving" | "warn-limit";

function MicButtonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 text-[var(--color-surface)]" fill="currentColor" aria-hidden>
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
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveTranscribing, setLiveTranscribing] = useState(false);
  const [recordingSignal, setRecordingSignal] =
    useState<RecordingSignal>("checking");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/mp4");
  const webkitRef = useRef(false);
  const durationRef = useRef(0);
  const abortingRef = useRef(false);
  const autoStoppingRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const liveTranscribeBusyRef = useRef(false);
  const lastCumulativeAttemptRef = useRef(0);
  const recordingActiveRef = useRef(false);
  const liveSpeechRef = useRef<LiveSpeechSession | null>(null);
  const livePanelScrollRef = useRef<HTMLDivElement | null>(null);

  const persistLiveRawForRecovery = (text?: string) => {
    const raw = (text ?? liveTranscriptRef.current).trim();
    if (!raw) return;
    saveLiveRawTranscript(raw);
    setCached(loadTranscriptCache());
  };

  const scrollLivePanelToBottom = useCallback(() => {
    const el = livePanelScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const setLiveTranscriptConfirmed = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      liveTranscriptRef.current = trimmed;
      setLiveTranscript(trimmed);
      setInterimTranscript("");
      persistLiveRawForRecovery(trimmed);
      setRecordingSignal("receiving");
      requestAnimationFrame(scrollLivePanelToBottom);
    },
    [scrollLivePanelToBottom]
  );

  const stopLiveSpeech = () => {
    liveSpeechRef.current?.stop();
    liveSpeechRef.current = null;
    recordingActiveRef.current = false;
    setInterimTranscript("");
  };

  const releaseRecorder = () => {
    stopLiveSpeech();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    durationRef.current = 0;
    abortingRef.current = false;
    autoStoppingRef.current = false;
  };

  const abortRecording = (message: string) => {
    if (abortingRef.current) return;
    abortingRef.current = true;
    stopLiveSpeech();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;

    setError(
      liveTranscriptRef.current.trim()
        ? `${message}\n\n途中までの文字起こしは下の「元の入力テキスト」から確認できます。`
        : message
    );
    setState("idle");
    setRecordingSignal("checking");
    persistLiveRawForRecovery();

    if (recorder) {
      recorder.onstop = () => {
        const chunksCopy = [...chunksRef.current];
        const mimeType = mimeTypeRef.current || "audio/mp4";

        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        abortingRef.current = false;

        if (chunksCopy.length === 0) return;

        const blob = new Blob(chunksCopy, { type: mimeType });
        if (blob.size < LIVE_SEGMENT_MIN_BYTES) return;

        void transcribeChunk(blob)
          .then((text) => {
            if (text) setLiveTranscriptConfirmed(text);
          })
          .catch(() => {
            /* 復旧用の追記は失敗しても録音停止は優先済み */
          });
      };
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          stream?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          abortingRef.current = false;
        }
      }
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      chunksRef.current = [];
      abortingRef.current = false;
    }
  };

  const checkRecordingHealth = () => {
    if (abortingRef.current || autoStoppingRef.current) return;

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    const secs = durationRef.current;
    const bytes = totalChunkBytes(chunksRef.current);

    const audioTrack = stream?.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState === "ended") {
      abortRecording(
        "マイクの接続が切れました。ページを再読み込みして、もう一度お試しください。"
      );
      return;
    }

    if (recorder && recorder.state !== "recording") {
      abortRecording(
        "録音が途中で停止しました。ページを再読み込みして、もう一度お試しください。"
      );
      return;
    }

    if (secs >= RECORDING_HEALTH_CHECK_SEC && bytes === 0) {
      abortRecording(
        "音声が録音できていません。マイクの許可を確認し、画面を開いたまま話してから、ページを再読み込みしてお試しください。"
      );
      return;
    }

    if (bytes >= RECORDING_AUTO_STOP_BYTES) {
      autoStoppingRef.current = true;
      setRecordingSignal("warn-limit");
      stopRecording();
    } else if (bytes >= RECORDING_AUTO_STOP_BYTES * 0.75) {
      setRecordingSignal("warn-limit");
    }

    if (
      secs >= LIVE_FIRST_TRANSCRIBE_SEC &&
      secs % LIVE_TRANSCRIBE_INTERVAL_SEC === 0
    ) {
      void transcribeLiveCumulative();
    }
  };

  useEffect(() => {
    webkitRef.current = isIOSOrWebKit();
    setCached(loadTranscriptCache());
    return () => {
      releaseRecorder();
    };
  }, []);

  const pickMimeType = () => {
    if (webkitRef.current) return getWebKitRecorderMimeType() ?? "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  };

  const startMediaRecorder = (recorder: MediaRecorder, webkit: boolean) => {
    if (webkit) {
      // WebKit 公式例: start(1000) で 1 秒ごとにチャンクを受け取る
      try {
        recorder.start(IOS_TIMESLICE_MS);
        return;
      } catch {
        recorder.start();
        return;
      }
    }
    recorder.start(IOS_TIMESLICE_MS);
  };

  const correctTranscript = async (raw: string) => {
    setState("correcting");
    setProcessingStep("correcting");

    const res = await fetch("/api/correct-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: raw }),
    });

    const data = await parseJsonResponse<{
      text?: string;
      rawText?: string;
      error?: string;
    }>(res);

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

    const summarizeData = await parseJsonResponse<{
      draft?: GameRecordDraft;
      transcript?: string;
      error?: string;
    }>(summarizeRes);

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
      liveRawTranscript: rawTranscript ?? liveTranscriptRef.current.trim(),
      draft: summarizeData.draft,
    });
    setCached(loadTranscriptCache());

    const sourceInputText =
      rawTranscript?.trim() || liveTranscriptRef.current.trim() || undefined;

    saveDraft({
      draft: {
        ...summarizeData.draft,
        sourceInputText,
      },
      transcript: finalTranscript,
      rawTranscript,
      sourceInputText,
    });
    router.push("/records/new/preview");
  };

  const transcribeLiveCumulative = async () => {
    if (liveTranscribeBusyRef.current || abortingRef.current) return;
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current || "audio/mp4",
    });
    if (blob.size < LIVE_SEGMENT_MIN_BYTES) return;

    liveTranscribeBusyRef.current = true;
    setLiveTranscribing(true);

    try {
      const text = await transcribeChunk(blob);
      if (text) setLiveTranscriptConfirmed(text);
    } catch {
      /* 録音中の部分音声は端末によって失敗することがある。次の周期で再試行 */
    } finally {
      liveTranscribeBusyRef.current = false;
      setLiveTranscribing(false);
    }
  };

  const scheduleLiveCumulativeTranscribe = () => {
    if (!recordingActiveRef.current || abortingRef.current) return;
    if (durationRef.current < LIVE_FIRST_TRANSCRIBE_SEC) return;
    if (liveTranscribeBusyRef.current) return;

    const bytes = totalChunkBytes(chunksRef.current);
    if (bytes < LIVE_SEGMENT_MIN_BYTES) return;

    const now = Date.now();
    if (now - lastCumulativeAttemptRef.current < 4_000) return;
    lastCumulativeAttemptRef.current = now;
    void transcribeLiveCumulative();
  };

  const flushLiveTranscript = async () => {
    await transcribeLiveCumulative();
    let retries = 0;
    while (liveTranscribeBusyRef.current && retries < 40) {
      await new Promise((r) => setTimeout(r, 250));
      retries += 1;
    }
  };

  const transcribeChunk = async (chunk: Blob): Promise<string> => {
    const ext = audioBlobExtension(chunk);
    const form = new FormData();
    form.append("audio", chunk, `recording.${ext}`);

    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await parseJsonResponse<{ text?: string; error?: string }>(res);

    if (!res.ok) {
      throw new Error(data.error ?? "文字起こしに失敗しました。");
    }

    return data.text?.trim() ?? "";
  };

  const processAudio = async (blob: Blob) => {
    setState("transcribing");
    setProcessingStep("transcribing");

    if (blob.size === 0) {
      throw new Error(
        "録音データを取得できませんでした。画面を開いたまま、3秒以上話してから停止してください。改善しない場合はページを再読み込みしてお試しください。"
      );
    }

    const chunks = await buildUploadChunks(blob);
    const parts: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (chunks.length > 1) {
        setProcessingStep("transcribing");
      }
      const text = await transcribeChunk(chunks[i]);
      if (text) parts.push(text);
    }

    const rawTranscript = parts.join("\n").trim();
    if (!rawTranscript) {
      throw new Error(
        "音声を認識できませんでした。もう少し大きな声ではっきり話してから、再度お試しください。"
      );
    }

    const { corrected, raw } = await correctTranscript(rawTranscript);

    saveTranscriptCache({
      transcript: corrected,
      rawTranscript: raw,
      liveRawTranscript: raw,
      isNewTranscript: true,
    });
    setCached(loadTranscriptCache());

    await summarizeTranscript(corrected, raw);
  };

  const handleUseLiveRawTranscript = async () => {
    const source = cached?.liveRawTranscript?.trim();
    if (!source) return;
    setError(null);
    try {
      const { corrected, raw } = await correctTranscript(source);
      saveTranscriptCache({
        transcript: corrected,
        rawTranscript: raw,
        liveRawTranscript: source,
      });
      setCached(loadTranscriptCache());
      await summarizeTranscript(corrected, raw);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "処理中にエラーが発生しました。";
      setError(
        `${message}\n\n保存済みのテキストは「元の入力テキスト」から再度お試しできます。`
      );
      setState("idle");
      setProcessingStep(null);
    }
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
    setRecordingSignal("checking");
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    setInterimTranscript("");
    setLiveTranscribing(false);
    liveTranscribeBusyRef.current = false;
    lastCumulativeAttemptRef.current = 0;
    releaseRecorder();

    if (typeof MediaRecorder === "undefined") {
      setError("この端末では音声録音に対応していません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const webkit = webkitRef.current;

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
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          setRecordingSignal("receiving");
          scheduleLiveCumulativeTranscribe();
        }
      });

      recorder.addEventListener("error", () => {
        abortRecording(
          "録音中にエラーが発生しました。ページを再読み込みして、もう一度お試しください。"
        );
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener("ended", () => {
          abortRecording(
            "マイクの接続が切れました。ページを再読み込みして、もう一度お試しください。"
          );
        });
      }

      startMediaRecorder(recorder, webkit);

      mediaRecorderRef.current = recorder;
      recordingActiveRef.current = true;
      liveSpeechRef.current = createLiveSpeechSession(
        (text, isInterim) => {
          if (isInterim) {
            setInterimTranscript(text);
            setRecordingSignal("receiving");
            requestAnimationFrame(scrollLivePanelToBottom);
            return;
          }
          setInterimTranscript("");
          if (
            !liveTranscriptRef.current ||
            text.length >= liveTranscriptRef.current.length
          ) {
            liveTranscriptRef.current = text;
            setLiveTranscript(text);
            persistLiveRawForRecovery(text);
            setRecordingSignal("receiving");
            requestAnimationFrame(scrollLivePanelToBottom);
          }
        },
        () => recordingActiveRef.current
      );
      liveSpeechRef.current?.start();

      setState("recording");
      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
        checkRecordingHealth();
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("denied")
      ) {
        setError("マイクの使用が許可されていません。設定から許可してください。");
      } else if (msg.includes("expected pattern")) {
        setError(
          "録音の開始に失敗しました。ページを再読み込みしてから、もう一度お試しください。"
        );
      } else {
        setError("録音を開始できませんでした。ページを再読み込みしてもう一度お試しください。");
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (abortingRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const stream = streamRef.current;
    const actualType = mimeTypeRef.current || "audio/mp4";

    recorder.onstop = async () => {
      if (abortingRef.current) return;

      try {
        stopLiveSpeech();
        await flushLiveTranscript();
        const blob = await assembleRecordingBlob(chunksRef.current, actualType);
        chunksRef.current = [];
        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        autoStoppingRef.current = false;
        setRecordingSignal("checking");

        await processAudio(blob);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "処理中にエラーが発生しました。";
        persistLiveRawForRecovery();
        setError(
          liveTranscriptRef.current.trim()
            ? `${message}\n\n途中までの文字起こしは下の「元の入力テキスト」から確認できます。`
            : message
        );
        setState("idle");
        setProcessingStep(null);
        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        autoStoppingRef.current = false;
        setRecordingSignal("checking");
      }
    };

    try {
      recorder.stop();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "録音の停止に失敗しました。";
      setError(message);
      setState("idle");
      setProcessingStep(null);
      releaseRecorder();
    }
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
  const savedLiveRaw = cached?.liveRawTranscript?.trim();
  const displayLiveText = liveTranscript || interimTranscript;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      {state === "recording" && (
        <section className="flex w-full max-w-sm min-h-[200px] max-h-[min(50vh,360px)] flex-col gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-4 shadow-md">
          <p className="text-xs font-semibold text-[var(--color-primary)]">
            文字起こし（話している間に表示されます）
          </p>
          <div
            ref={livePanelScrollRef}
            className="flex-1 overflow-y-auto"
          >
            {displayLiveText ? (
              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  interimTranscript && !liveTranscript
                    ? "text-[var(--color-text-sub)]"
                    : "text-[var(--color-text)]"
                }`}
              >
                {displayLiveText}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-sub)]">
                話し始めると、ここに文字が表示されます…
              </p>
            )}
            {liveTranscribing && (
              <p className="mt-2 text-xs text-[var(--color-primary)]">
                高精度の文字起こしを更新中…
              </p>
            )}
          </div>
        </section>
      )}

      {state !== "recording" && (
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-sub)] p-4">
        <p className="mb-3 text-center text-sm font-bold text-[var(--color-text)]">
          この順番で話すと精度が上がります
        </p>
        <ol className="space-y-2 text-sm">
          {[
            { label: "対局形式", example: "例）棋の音香落ち下手、将棋ウォーズ10切れ" },
            { label: "相手の段位・級位", example: "例）会館初段、棋の音の初段" },
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
      )}

      {hasCache && (
        <p className="text-center text-xs font-medium text-[var(--color-primary)]">
          下のマイクをタップして、新しい対局を録音できます
        </p>
      )}

      {isProcessing && (
        <section className="flex w-full max-w-sm min-h-[120px] max-h-[min(40vh,240px)] flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--color-text-sub)]">
            文字起こし
          </p>
          <div className="flex-1 overflow-y-auto">
            {liveTranscript ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
                {liveTranscript}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-sub)]">
                最終の文字起こしを処理しています…
              </p>
            )}
          </div>
        </section>
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
        <div className="flex w-full max-w-sm flex-col items-center gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-danger)]">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-danger)]" />
            録音中 {formatDuration(duration)}
          </p>
          <p
            className={`text-center text-xs ${
              recordingSignal === "receiving"
                ? "text-[var(--color-success)]"
                : recordingSignal === "warn-limit"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-sub)]"
            }`}
          >
            {recordingSignal === "receiving"
              ? "音声を受信中"
              : recordingSignal === "warn-limit"
                ? "録音が長くなっています。そろそろ停止してください"
                : "マイクを確認しています…"}
          </p>
        </div>
      )}

      {state === "recording" && error && (
        <div className="w-full max-w-sm rounded-lg bg-[var(--color-surface)] p-3 text-sm whitespace-pre-wrap text-[var(--color-danger)]">
          {error}
        </div>
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
          <p className="mt-1 text-xs">
            長い録音は分割して処理します（1〜2分ほどかかることがあります）
          </p>
        </div>
      )}

      {error && state !== "recording" && (
        <div className="w-full max-w-sm rounded-lg bg-[var(--color-surface)] p-3 text-sm whitespace-pre-wrap text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {state === "idle" && !error && (
        <p className="text-center text-xs text-[var(--color-text-sub)]">
          録音中は話した内容がリアルタイムで表示されます。停止後に将棋用語補正→要約へ進みます。
        </p>
      )}

      {state === "idle" && savedLiveRaw && !isProcessing && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <SourceInputCollapsible text={savedLiveRaw} />
          <p className="text-center text-xs text-[var(--color-text-sub)]">
            {formatCacheDate(cached!.savedAt)} に保存
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleUseLiveRawTranscript}
          >
            このテキストから要約を作る
          </Button>
        </div>
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
