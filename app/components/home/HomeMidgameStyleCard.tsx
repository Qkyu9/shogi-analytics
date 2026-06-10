"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MidgameStyleAnalysis } from "@/app/components/analysis/MidgameStyleAnalysis";
import { Card } from "@/app/components/ui/Card";
import {
  aggregateMidgameStyleMetrics,
  type MidgameStyleAggregate,
} from "@/app/lib/midgame-style-analysis";
import { getAllRecordDetails } from "@/app/lib/record-storage";

export function HomeMidgameStyleCard() {
  const [metrics, setMetrics] = useState<MidgameStyleAggregate | null>(null);

  useEffect(() => {
    getAllRecordDetails()
      .then((records) => {
        setMetrics(aggregateMidgameStyleMetrics(records));
      })
      .catch(() => setMetrics(null));
  }, []);

  if (!metrics) return null;

  return (
    <Card>
      <p className="text-xs text-[var(--color-text-sub)]">中盤棋風分析</p>
      <div className="mt-2">
        <MidgameStyleAnalysis metrics={metrics} compact />
      </div>
      <Link
        href="/analysis"
        className="mt-3 inline-block text-xs text-[var(--color-primary)]"
      >
        詳しく見る
      </Link>
    </Card>
  );
}
