"use client";

import { CollapsibleSection } from "@/app/components/ui/CollapsibleSection";
import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import type { KishinInsight } from "@/app/lib/types";

export function KishinInsightView({
  kifuText,
  insight,
  loading = false,
  loadError = false,
}: {
  kifuText?: string;
  insight?: KishinInsight;
  loading?: boolean;
  loadError?: boolean;
}) {
  const trimmedKifu = kifuText?.trim() ?? "";

  if (!trimmedKifu) {
    return (
      <p className="text-sm text-[var(--color-text-sub)]">
        棋譜が登録されていません。編集画面で棋神アナリティクスの棋譜を貼り付けて保存すると、ここに示唆が表示されます。
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-text-sub)]">
        棋神からの示唆を読み込んでいます…
      </p>
    );
  }

  if (!insight) {
    return (
      <p className="text-sm text-[var(--color-text-sub)]">
        {loadError
          ? "棋神からの示唆を取得できませんでした。記録を編集して保存し直すと、再度生成を試みます。"
          : "棋神からの示唆を準備しています…"}
      </p>
    );
  }

  const summaries = insight.briefSummaries.filter(Boolean);
  const turningCount = insight.turningPoints.length;

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="mb-3 text-sm font-semibold">端的なまとめ</h2>
        <ol className="flex flex-col gap-2.5 text-sm leading-relaxed">
          {summaries.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="min-w-[1.25rem] font-semibold text-[var(--color-primary)]">
                {index + 1}.
              </span>
              <span className="text-[var(--color-text)]">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      {turningCount > 0 && (
        <CollapsibleSection
          title="形勢が大きく動いた要所"
          preview={`${turningCount}件の要所（タップで詳細）`}
        >
          <div className="flex flex-col gap-3">
            {insight.turningPoints.map((tp, index) => (
              <div
                key={`${tp.moveNumber}-${index}`}
                className="rounded-lg bg-[var(--color-surface)] p-3 text-sm"
              >
                <p className="font-semibold">
                  {tp.moveNumber}手 {tp.move}
                </p>
                {tp.evalChange && (
                  <p className="mt-1 text-xs text-[var(--color-text-sub)]">
                    評価変化: {tp.evalChange}
                  </p>
                )}
                {tp.topCandidate &&
                  normalizeMoveToken(tp.topCandidate) !==
                    normalizeMoveToken(tp.move) && (
                  <p className="mt-1 text-xs text-[var(--color-text-sub)]">
                    候補手: {tp.topCandidate}
                  </p>
                )}
                {tp.insight && (
                  <p className="mt-2 leading-relaxed">{tp.insight}</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="棋譜・評価値データ（生）"
        preview={`${trimmedKifu.length.toLocaleString()}文字（タップで全文）`}
      >
        <div className="max-h-[min(50vh,360px)] overflow-y-auto rounded-md bg-[var(--color-surface)] p-3">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
            {trimmedKifu}
          </pre>
        </div>
      </CollapsibleSection>
    </div>
  );
}
