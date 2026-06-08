"use client";

import { useEffect, useState } from "react";
import { RecordList } from "@/app/components/records/RecordList";
import { getAllRecordSummaries } from "@/app/lib/record-storage";
import type { GameRecordSummary } from "@/app/lib/types";

export function RecordsView({ limit }: { limit?: number }) {
  const [records, setRecords] = useState<GameRecordSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllRecordSummaries()
      .then((all) => {
        setRecords(limit ? all.slice(0, limit) : all);
        setReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
        setReady(true);
      });
  }, [limit]);

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center text-sm text-red-600">{error}</p>
    );
  }

  return <RecordList records={records} />;
}
