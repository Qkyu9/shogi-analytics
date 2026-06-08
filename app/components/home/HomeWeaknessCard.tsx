"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/Card";
import { computeTagStats } from "@/app/lib/record-stats";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import type { TagStat } from "@/app/lib/types";

export function HomeWeaknessCard() {
  const [top, setTop] = useState<TagStat | null>(null);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        const stats = computeTagStats(records);
        setTop(stats[0] ?? null);
      })
      .catch(() => setTop(null));
  }, []);

  if (!top) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--color-text-sub)]">
        いまの弱点（直近）
      </h2>
      <p className="mt-2 text-lg font-bold">{top.tag}</p>
      <p className="mt-1 text-sm text-[var(--color-text-sub)]">
        {top.count}回出現（{top.percentage}%）
      </p>
      <Link
        href="/analysis"
        className="mt-3 inline-block text-sm text-[var(--color-primary)]"
      >
        詳しく見る →
      </Link>
    </Card>
  );
}
