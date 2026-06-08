"use client";

import { useEffect, useState } from "react";
import { StudyMenuCard } from "@/app/components/analysis/StudyMenuCard";
import type { StudyAllocation } from "@/app/lib/types";
import { computeTagStats } from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";

const DAILY_STUDY_MINUTES = 60;

export function StudyMenuView() {
  const [allocations, setAllocations] = useState<StudyAllocation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        const stats = computeTagStats(records);
        if (stats.length === 0) {
          setAllocations([]);
          setReady(true);
          return;
        }
        const top = stats[0];
        setAllocations([
          {
            item: "中盤手筋",
            percentage: 40,
            reason: `#${top.tag} が最多。記録が増えると提案を精緻化する`,
          },
          {
            item: "実戦",
            percentage: 35,
            reason: "対局直後の振り返りとセットで弱点を定着させる",
          },
          {
            item: "詰め将棋",
            percentage: 25,
            dailyCount: 5,
            reason: "短い読みの維持",
          },
        ]);
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

  if (allocations.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        記録がまだありません。対局を記録すると学習メニューが表示されます。
      </p>
    );
  }

  const totalPercent = allocations.reduce((sum, a) => sum + a.percentage, 0);

  return (
    <>
      <StudyMenuCard
        allocations={allocations}
        dailyStudyMinutes={DAILY_STUDY_MINUTES}
      />
      <p className="text-center text-xs text-[var(--color-text-sub)]">
        配分合計: {totalPercent}%
      </p>
    </>
  );
}
