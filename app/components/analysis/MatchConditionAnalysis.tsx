"use client";

import { StrategyRanking } from "@/app/components/analysis/StrategyRanking";
import type { StrategyStat } from "@/app/lib/types";

export function MatchConditionAnalysis({
  playerSideStats,
  handicapStats,
}: {
  playerSideStats: StrategyStat[];
  handicapStats: StrategyStat[];
}) {
  const hasData = playerSideStats.length > 0 || handicapStats.length > 0;

  if (!hasData) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          対局形式・手合の勝率
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          手合や先手・後手が記録された対局があると、ここに勝率が表示されます。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3">
      <p className="text-sm font-semibold text-[var(--color-text)]">
        対局形式・手合の勝率
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-sub)]">
        先手番・後手番や香落ち下手など、手合別の勝率を表示します。
      </p>
      <div className="mt-4 flex flex-col gap-5">
        {playerSideStats.length > 0 && (
          <StrategyRanking
            title="先手番・後手番"
            stats={playerSideStats}
            emptyMessage=""
            hideFooterNote
          />
        )}
        {handicapStats.length > 0 && (
          <StrategyRanking
            title="手合別"
            stats={handicapStats}
            emptyMessage=""
            hideFooterNote
          />
        )}
      </div>
    </section>
  );
}
