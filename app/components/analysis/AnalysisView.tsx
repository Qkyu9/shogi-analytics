"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MidgameStyleAnalysis } from "@/app/components/analysis/MidgameStyleAnalysis";
import { AnalysisPeriodTabs } from "@/app/components/analysis/AnalysisPeriodTabs";
import { MatchConditionAnalysis } from "@/app/components/analysis/MatchConditionAnalysis";
import { StrategyRanking } from "@/app/components/analysis/StrategyRanking";
import { WeaknessRanking } from "@/app/components/analysis/WeaknessRanking";
import { Button } from "@/app/components/ui/Button";
import { aggregateMidgameStyleMetrics } from "@/app/lib/midgame-style-analysis";
import {
  computeHandicapStats,
  computeMyStrategyStats,
  computeOpponentStrategyStats,
  computePlayerSideStats,
  computeTagStats,
  filterRecordsByPeriod,
  type AnalysisPeriod,
} from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import type { GameRecordDetail } from "@/app/lib/types";

export function AnalysisView() {
  const [allRecords, setAllRecords] = useState<GameRecordDetail[]>([]);
  const [period, setPeriod] = useState<AnalysisPeriod>("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        setAllRecords(records);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const filteredRecords = useMemo(
    () => filterRecordsByPeriod(allRecords, period),
    [allRecords, period]
  );

  const stats = useMemo(
    () => computeTagStats(filteredRecords),
    [filteredRecords]
  );
  // 表示用：局面フェーズ（序盤・中盤・終盤）でまとめた弱点分析
  const groupedTagStats = useMemo(
    () => computeTagStats(filteredRecords, { groupByPhase: true }),
    [filteredRecords]
  );
  const myStrategyStats = useMemo(
    () => computeMyStrategyStats(filteredRecords, { groupByParent: true }),
    [filteredRecords]
  );
  const opponentStrategyStats = useMemo(
    () =>
      computeOpponentStrategyStats(filteredRecords, { groupByParent: true }),
    [filteredRecords]
  );
  const playerSideStats = useMemo(
    () => computePlayerSideStats(filteredRecords),
    [filteredRecords]
  );
  const handicapStats = useMemo(
    () => computeHandicapStats(filteredRecords),
    [filteredRecords]
  );

  const midgameStyleMetrics = useMemo(
    () => aggregateMidgameStyleMetrics(filteredRecords),
    [filteredRecords]
  );

  const topWeaknessTag = stats[0]?.tag ?? null;

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </p>
    );
  }

  if (allRecords.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        記録がまだありません。対局を記録すると弱点分析が表示されます。
      </p>
    );
  }

  const periodEmpty = filteredRecords.length === 0;
  const lowDataWarning = filteredRecords.length < 10;

  return (
    <>
      <AnalysisPeriodTabs
        period={period}
        onChange={setPeriod}
        recordCount={filteredRecords.length}
      />

      {periodEmpty ? (
        <p className="rounded-lg bg-[var(--color-surface)] p-4 text-center text-sm text-[var(--color-text-sub)]">
          {period === "month"
            ? "直近1か月の対局記録がありません。"
            : "表示できる記録がありません。"}
        </p>
      ) : (
        <>
          {midgameStyleMetrics && (
            <MidgameStyleAnalysis
              metrics={midgameStyleMetrics}
              linkedWeaknessTag={topWeaknessTag}
            />
          )}

          {midgameStyleMetrics && (
            <div className="my-2 h-px bg-[var(--color-border)]" />
          )}

          <WeaknessRanking
            stats={groupedTagStats}
            lowDataWarning={lowDataWarning}
          />

          <div className="my-2 h-px bg-[var(--color-border)]" />

          <MatchConditionAnalysis
            playerSideStats={playerSideStats}
            handicapStats={handicapStats}
          />

          <div className="my-2 h-px bg-[var(--color-border)]" />

          <StrategyRanking
            title="自分の戦型（採用回数順）"
            stats={myStrategyStats}
            emptyMessage="この期間に戦型が記録された対局がありません。"
          />

          <div className="my-2 h-px bg-[var(--color-border)]" />

          <StrategyRanking
            title="相手の戦型（対局数順）"
            stats={opponentStrategyStats}
            emptyMessage="この期間に相手の戦型が記録された対局がありません。"
          />
        </>
      )}

      <Link href="/study-menu" className="block">
        <Button fullWidth>学習メニューを見る</Button>
      </Link>
    </>
  );
}
