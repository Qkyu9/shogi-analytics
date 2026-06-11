"use client";

import type { ReactNode } from "react";
import { CollapsibleSection } from "@/app/components/ui/CollapsibleSection";
import { buildKishinDisplay } from "@/app/lib/kishin-insight-display";
import type { KishinInsight } from "@/app/lib/types";

function InsightBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-[var(--color-text)]">
        {children}
      </div>
    </section>
  );
}

function TurningPointCard({
  index,
  moveNumber,
  actualMove,
  candidateMove,
  evalChange,
  intent,
}: {
  index: number;
  moveNumber: number;
  actualMove: string;
  candidateMove: string;
  evalChange: string;
  intent: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-sm font-semibold text-[var(--color-text)]">
        要所 {index + 1}（{moveNumber}手目）
      </p>
      <dl className="mt-2 flex flex-col gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="min-w-[3rem] shrink-0 font-medium text-[var(--color-text-sub)]">
            本譜
          </dt>
          <dd className="text-[var(--color-text)]">
            {actualMove || "（棋譜から取得できませんでした）"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="min-w-[3rem] shrink-0 font-medium text-[var(--color-text-sub)]">
            候補
          </dt>
          <dd className="text-[var(--color-text)]">
            {candidateMove || "（棋譜に候補手の記載なし）"}
          </dd>
        </div>
        {evalChange && (
          <div className="flex gap-2">
            <dt className="min-w-[3rem] shrink-0 font-medium text-[var(--color-text-sub)]">
              評価
            </dt>
            <dd className="text-[var(--color-text-sub)]">{evalChange}</dd>
          </div>
        )}
        <div className="mt-1 flex flex-col gap-1">
          <dt className="font-medium text-[var(--color-text-sub)]">狙い</dt>
          <dd className="leading-relaxed text-[var(--color-text)]">
            {intent || "（候補手の狙いは未生成です）"}
          </dd>
          {intent && (
            <p className="text-xs text-[var(--color-text-sub)]">
              ※ 読み筋・局面からAIが推定した内容です
            </p>
          )}
        </div>
      </dl>
    </div>
  );
}

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

  const display = buildKishinDisplay(insight, trimmedKifu);

  return (
    <div className="flex flex-col gap-5">
      <InsightBlock title="序盤">
        <p>{display.opening}</p>
      </InsightBlock>

      {display.turningPoints.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-primary)]">
            形勢が大きく動いた要所
          </h2>
          <div className="flex flex-col gap-3">
            {display.turningPoints.map((tp, index) => (
              <TurningPointCard
                key={`${tp.moveNumber}-${index}`}
                index={index}
                moveNumber={tp.moveNumber}
                actualMove={tp.actualMove}
                candidateMove={tp.candidateMove}
                evalChange={tp.evalChange}
                intent={tp.intent}
              />
            ))}
          </div>
        </section>
      )}

      <InsightBlock title="終盤">
        <p>{display.endgame}</p>
      </InsightBlock>

      {display.lesson && (
        <InsightBlock title="教訓">
          <p>{display.lesson}</p>
        </InsightBlock>
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
