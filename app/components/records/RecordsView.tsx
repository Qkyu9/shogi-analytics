"use client";

import { useEffect, useState } from "react";
import { RecordList } from "@/app/components/records/RecordList";
import {
  ensureRecordsInitialized,
  getAllRecordSummaries,
} from "@/app/lib/record-storage";
import type { GameRecordSummary } from "@/app/lib/types";

export function RecordsView({ limit }: { limit?: number }) {
  const [records, setRecords] = useState<GameRecordSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureRecordsInitialized();
    const all = getAllRecordSummaries();
    setRecords(limit ? all.slice(0, limit) : all);
    setReady(true);
  }, [limit]);

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </p>
    );
  }

  return <RecordList records={records} />;
}
