"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import {
  runTranscriptPipeline,
  type TranscriptPipelineStep,
} from "@/app/lib/transcript-pipeline-client";

export function PasteTranscriptInput() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [step, setStep] = useState<TranscriptPipelineStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isProcessing = step !== null;
  const canSubmit = text.trim().length > 0 && !isProcessing;

  const handleSubmit = async () => {
    setError(null);
    try {
      await runTranscriptPipeline(text, setStep);
      setText("");
      router.push("/records/new/preview");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "処理中にエラーが発生しました。";
      setError(
        `${message}\n\n貼り付けたテキストはそのまま残っています。内容を確認して再度お試しください。`
      );
      setStep(null);
    }
  };

  return (
    <section className="w-full max-w-sm px-4 pb-10">
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-sub)]">または</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--color-text)]"
        >
          <span>他のアプリの文字起こしを貼り付ける</span>
          <span className="text-xs font-normal text-[var(--color-text-sub)]">
            {expanded ? "閉じる" : "開く"}
          </span>
        </button>

        {!expanded && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-sub)]">
            ChatGPT などで話した内容を文字起こししたテキストを、ここに貼り付けて要約できます。
          </p>
        )}

        {expanded && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
              道場で対局直後に、ChatGPT など別アプリで音声入力・文字起こしだけ済ませた内容を貼り付けてください。将棋
              Analytics が将棋用語の補正と要約を行います。アカウントの切り替えは不要で、いまログイン中のアカウントに保存されます。
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isProcessing}
              placeholder="ChatGPT などで文字起こしした内容をここに貼り付け"
              rows={8}
              className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-sub)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60"
            />

            {isProcessing && (
              <p className="text-center text-sm text-[var(--color-text-sub)]">
                {step === "correcting"
                  ? "将棋用語を補正中..."
                  : "AIが要約を作成中..."}
              </p>
            )}

            {error && (
              <div className="rounded-lg bg-[var(--color-surface)] p-3 text-sm whitespace-pre-wrap text-[var(--color-danger)]">
                {error}
              </div>
            )}

            <Button fullWidth disabled={!canSubmit} onClick={handleSubmit}>
              貼り付けた内容から要約を作る
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
