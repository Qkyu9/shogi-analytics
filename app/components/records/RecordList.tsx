import type { GameRecordSummary } from "@/app/lib/types";
import { RecordCard } from "./RecordCard";

export function RecordList({ records }: { records: GameRecordSummary[] }) {
  if (records.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        まだ記録がありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {records.map((record) => (
        <RecordCard key={record.id} record={record} />
      ))}
    </div>
  );
}
