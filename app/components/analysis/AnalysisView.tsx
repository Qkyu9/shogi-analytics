"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WeaknessRanking } from "@/app/components/analysis/WeaknessRanking";
import { Button } from "@/app/components/ui/Button";
import { computeTagStats } from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import type { TagStat } from "@/app/lib/types";

export function AnalysisView() {
  const [stats, setStats] = useState<TagStat[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        setTotalRecords(records.length);
        setStats(computeTagStats(records));
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

  return (
    <>
      <WeaknessRanking
        stats={stats}
        totalRecords={totalRecords}
        lowDataWarning={totalRecords < 10}
      />
      <Link href="/study-menu" className="block">
        <Button fullWidth>学習メニューを見る</Button>
      </Link>
    </>
  );
}
