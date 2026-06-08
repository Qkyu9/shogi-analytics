import Link from "next/link";
import type { GameRecordSummary } from "@/app/lib/types";
import { formatDate, resultLabel } from "@/app/lib/utils";
import { TagChip } from "@/app/components/ui/TagChip";

export function RecordCard({ record }: { record: GameRecordSummary }) {
  return (
    <Link href={`/records/${record.id}`}>
      <article className="block rounded-xl bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-hover)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-text-sub)]">
            {formatDate(record.playedAt)}
          </span>
          <span className="text-sm text-[var(--color-text)]">
            {resultLabel(record.result)}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--color-text)]">
          {record.myStrategy} vs {record.opponentStrategy}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
          {record.venueLabel}
        </p>
        {record.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {record.tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}
