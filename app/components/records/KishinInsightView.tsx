"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/app/components/ui/CollapsibleSection";
import { Button } from "@/app/components/ui/Button";
import { generateKishinInsight } from "@/app/lib/kishin-insight-client";
import type { KishinInsight } from "@/app/lib/types";

export function KishinInsightView({
  kifuText,
  insight,
  onInsightGenerated,
}: {
  kifuText?: string;
  insight?: KishinInsight;
  onInsightGenerated?: (insight: KishinInsight) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localInsight, setLocalInsight] = useState<KishinInsight | undefined>(
    insight
  );

  const activeInsight = localInsight ?? insight;
  const trimmedKifu = kifuText?.trim() ?? "";

  const handleGenerate = async () => {
    if (!trimmedKifu) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateKishinInsight(trimmedKifu);
      setLocalInsight(generated);
      onInsightGenerated?.(generated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "棋神示唆の生成に失敗しました。"
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!trimmedKifu) {
    return (
      <p className="text-sm text-[var(--color-text-sub)]">
        棋譜が登録されていません。編集画面で棋神アナリティクスの棋譜を貼り付けると、ここに示唆が表示されます。
      </p>
    );
  }

  if (!activeInsight) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-text-sub)]">
          棋譜は登録済みです。棋神の評価・候補手から示唆を生成できます。
        </p>
        {error && (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        )}
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "棋神示唆を生成中..." : "棋神からの示唆を生成"}
        </Button>
      </div>
    );
  }

  const summaries = activeInsight.briefSummaries.filter(Boolean);
  const turningCount = activeInsight.turningPoints.length;

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
            {activeInsight.turningPoints.map((tp, index) => (
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
                {tp.topCandidate && (
                  <p className="mt-1 text-xs text-[var(--color-text-sub)]">
                    棋神候補: {tp.topCandidate}
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

      {onInsightGenerated && (
        <div className="border-t border-[var(--color-border)] pt-3">
          {error && (
            <p className="mb-2 text-sm text-[var(--color-danger)]">{error}</p>
          )}
          <Button
            variant="secondary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "再生成中..." : "棋神示唆を再生成"}
          </Button>
        </div>
      )}
    </div>
  );
}
