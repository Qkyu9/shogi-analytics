"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WeaknessBreakdownDetail } from "@/app/components/analysis/WeaknessBreakdownDetail";
import { Card } from "@/app/components/ui/Card";
import { computeTagStats } from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import type { GameRecordDetail, TagStat } from "@/app/lib/types";
import { getWeaknessBreakdown } from "@/app/lib/weakness-breakdown";

export function HomeWeaknessCard() {
  const [top, setTop] = useState<TagStat | null>(null);
  const [records, setRecords] = useState<GameRecordDetail[]>([]);

  useEffect(() => {
    getAllRecordDetails()
      .then((all) => {
        setRecords(all);
        const stats = computeTagStats(all);
        setTop(stats[0] ?? null);
      })
      .catch(() => {
        setTop(null);
        setRecords([]);
      });
  }, []);

  if (!top) return null;

  const breakdown = getWeaknessBreakdown(top.tag, records);

  return (
    <Card>
      <p className="text-xs text-[var(--color-text-sub)]">いまの弱点</p>
      <p className="mt-1 text-base font-medium text-[var(--color-text)]">
        {top.tag}
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
        {top.count}回（{top.percentage}%）
      </p>
      {breakdown && (
        <WeaknessBreakdownDetail breakdown={breakdown} compact />
      )}
      <Link
        href="/analysis"
        className="mt-3 inline-block text-xs text-[var(--color-primary)]"
      >
        詳しく見る
      </Link>
    </Card>
  );
}
