"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAllRecordSummaries,
  getRecordDetail,
} from "@/app/lib/record-storage";
import { pickVerbalLesson } from "@/app/lib/transcript-inference";

export function HomeLessonHeadline() {
  const [headline, setHeadline] = useState<{
    text: string;
    recordId: string;
  } | null>(null);

  useEffect(() => {
    getAllRecordSummaries()
      .then(async (summaries) => {
        const sorted = [...summaries].sort((a, b) =>
          b.playedAt.localeCompare(a.playedAt)
        );

        for (const summary of sorted) {
          const detail = await getRecordDetail(summary.id);
          if (!detail) continue;

          const text = pickVerbalLesson(detail.positions);
          if (text) {
            setHeadline({ text, recordId: detail.id });
            return;
          }
        }

        setHeadline(null);
      })
      .catch(() => setHeadline(null));
  }, []);

  if (!headline) return null;

  return (
    <section className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 shadow-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[var(--color-primary)]"
        aria-hidden
      />
      <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--color-text-sub)] uppercase">
        直近の教訓
      </p>
      <Link
        href={`/records/${headline.recordId}`}
        className="mt-3 block active:opacity-80"
      >
        <p
          className="text-xl leading-snug font-bold text-[var(--color-text)] md:text-2xl"
          style={{
            fontFamily:
              '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif',
          }}
        >
          {headline.text}
        </p>
        <span className="mt-3 inline-block text-xs text-[var(--color-primary)]">
          対局記録を見る
        </span>
      </Link>
    </section>
  );
}
