"use client";

import { useState } from "react";
import { transcriptPreview } from "@/app/lib/transcript-cache";

type SourceInputCollapsibleProps = {
  text: string;
  /** 閉じたときの一行プレビュー用 */
  previewMaxLen?: number;
  className?: string;
};

export function SourceInputCollapsible({
  text,
  previewMaxLen = 48,
  className = "",
}: SourceInputCollapsibleProps) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <section
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--color-text)]"
      >
        <span>元の入力テキスト</span>
        <span className="text-xs font-normal text-[var(--color-text-sub)]">
          {open ? "閉じる" : "開く"}
        </span>
      </button>
      {!open && (
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          {transcriptPreview(trimmed, previewMaxLen)}
        </p>
      )}
      {open && (
        <div className="mt-3 max-h-[min(50vh,320px)] overflow-y-auto rounded-md bg-[var(--color-surface)] p-3">
          <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
            音声入力または ChatGPT 等から貼り付けた、補正・要約前のテキストです。
          </p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
            {trimmed}
          </p>
        </div>
      )}
    </section>
  );
}
