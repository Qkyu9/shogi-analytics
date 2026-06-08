"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TagChip } from "@/app/components/ui/TagChip";
import {
  ensureRecordsInitialized,
  getRecordDetail,
} from "@/app/lib/record-storage";
import type { GameRecordDetail } from "@/app/lib/types";
import { formatDateTime, resultLabel } from "@/app/lib/utils";

export function RecordDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<GameRecordDetail | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureRecordsInitialized();
    const detail = getRecordDetail(id);
    if (!detail) {
      router.replace("/records");
      return;
    }
    setRecord(detail);
    setReady(true);
  }, [id, router]);

  if (!ready || !record) {
    return (
      <main className="px-4 py-8 text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <section>
        <p className="text-sm text-[var(--color-text-sub)]">
          {formatDateTime(record.playedAt)}
        </p>
        <p className="mt-1 font-semibold">{resultLabel(record.result)}</p>
        <p className="mt-1 text-sm">{record.venueLabel}</p>
        <p className="mt-2">
          {record.myStrategy} vs {record.opponentStrategy}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {record.tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      </section>

      {record.positions.map((pos, index) => (
        <section
          key={pos.sortOrder}
          className="rounded-lg border border-[var(--color-border)] p-4"
        >
          <h2 className="text-sm font-semibold">局面 {index + 1}</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">
                印象に残った局面
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.sceneDescription}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">敗因・疑問手</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.defeatCause}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">正着</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.correctMove}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">教訓</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.lesson}</dd>
            </div>
          </dl>
        </section>
      ))}

      {record.kifuText && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">棋譜</h2>
          <pre className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3 font-mono text-xs whitespace-pre-wrap">
            {record.kifuText}
          </pre>
        </section>
      )}

      <Link
        href="/records/new"
        className="text-center text-sm text-[var(--color-primary)]"
      >
        新しい記録を追加
      </Link>
    </main>
  );
}
