"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StrategyRanking } from "@/app/components/analysis/StrategyRanking";
import { WeaknessRanking } from "@/app/components/analysis/WeaknessRanking";
import { Button } from "@/app/components/ui/Button";
import {
  computeMyStrategyStats,
  computeOpponentStrategyStats,
  computeTagStats,
} from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import type { StrategyStat, TagStat } from "@/app/lib/types";

export function AnalysisView() {
  const [stats, setStats] = useState<TagStat[]>([]);
  const [myStrategyStats, setMyStrategyStats] = useState<StrategyStat[]>([]);
  const [opponentStrategyStats, setOpponentStrategyStats] = useState<
    StrategyStat[]
  >([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        setTotalRecords(records.length);
        setStats(computeTagStats(records));
        setMyStrategyStats(computeMyStrategyStats(records));
        setOpponentStrategyStats(computeOpponentStrategyStats(records));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </p>
    );
  }

  if (totalRecords === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        記録がまだありません。対局を記録すると弱点分析が表示されます。
      </p>
    );
  }

  const lowDataWarning = totalRecords < 10;

  return (
    <>
      <WeaknessRanking
        stats={stats}
        totalRecords={totalRecords}
        lowDataWarning={lowDataWarning}
      />

      <div className="my-2 h-px bg-[var(--color-border)]" />

      <StrategyRanking
        title="自分の戦型（採用回数順）"
        stats={myStrategyStats}
        emptyMessage="戦型が記録された対局がありません。要約保存時に自分の戦型を入力してください。"
      />

      <div className="my-2 h-px bg-[var(--color-border)]" />

      <StrategyRanking
        title="相手の戦型（対局数順）"
        stats={opponentStrategyStats}
        emptyMessage="相手の戦型が記録された対局がありません。"
      />

      <Link href="/study-menu" className="block">
        <Button fullWidth>学習メニューを見る</Button>
      </Link>
    </>
  );
}
