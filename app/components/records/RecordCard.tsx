import Link from "next/link";
import type { GameRecordSummary } from "@/app/lib/types";
import { formatDate, formatOpponentMatchLine, resultLabel } from "@/app/lib/utils";
import { TagChip } from "@/app/components/ui/TagChip";

function InputMethodTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-sub)]">
      {label}
    </span>
  );
}

export function RecordCard({
  record,
  isHeadlineRecord,
}: {
  record: GameRecordSummary;
  isHeadlineRecord?: boolean;
}) {
  return (
    <Link href={`/records/${record.id}`}>
      <article className="block rounded-xl bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-hover)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-xs text-[var(--color-text-sub)]">
              {formatDate(record.playedAt)}
            </span>
            {record.hasVoiceInput && <InputMethodTag label="音声入力" />}
            {record.hasKifuData && <InputMethodTag label="棋譜データ" />}
          </div>
          <span className="shrink-0 text-sm text-[var(--color-text)]">
            {resultLabel(record.result)}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--color-text)]">
          {record.myStrategy} vs{" "}
          {formatOpponentMatchLine(record.opponentStrategy, record.opponentRank)}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
          {record.venueLabel}
        </p>
        {record.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {record.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        )}
        {record.latestLesson && (
          <div className="mt-3">
            {isHeadlineRecord ? (
              <p className="text-[10px] text-[var(--color-text-sub)] italic">
                ↑ 上記の教訓に掲載
              </p>
            ) : (
              <p
                className="border-l-2 border-[var(--color-primary)] pl-2 text-xs leading-relaxed text-[var(--color-text)]"
                style={{
                  fontFamily:
                    '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif',
                }}
              >
                {record.latestLesson}
              </p>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
