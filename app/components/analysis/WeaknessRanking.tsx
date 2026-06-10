import Link from "next/link";
import { WeaknessBreakdownDetail } from "@/app/components/analysis/WeaknessBreakdownDetail";
import { getWeaknessBreakdown } from "@/app/lib/weakness-breakdown";
import type { GameRecordDetail } from "@/app/lib/types";
import type { TagStat } from "@/app/lib/types";

export function WeaknessRanking({
  stats,
  records,
  lowDataWarning,
}: {
  stats: TagStat[];
  records: GameRecordDetail[];
  lowDataWarning?: boolean;
}) {
  const maxCount = stats[0]?.count ?? 1;

  if (stats.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          弱点分析
        </h2>
        <p className="text-xs text-[var(--color-text-sub)]">
          この期間に敗因タグが記録された対局がありません。
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        弱点分析
      </h2>

      {lowDataWarning && (
        <div className="rounded-lg bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-sub)]">
          記録が10件未満です。傾向は参考程度にご覧ください。
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {stats.map((stat) => {
          const breakdown = getWeaknessBreakdown(stat.tag, records);

          const header = (
            <>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{stat.tag}</span>
                <span className="text-[var(--color-text-sub)]">
                  {stat.count}回 ({stat.percentage}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-sub)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${(stat.count / maxCount) * 100}%` }}
                />
              </div>
            </>
          );

          const body = (
            <>
              {header}
              {breakdown && <WeaknessBreakdownDetail breakdown={breakdown} />}
            </>
          );

          return (
            <li key={stat.tag}>
              {stat.latestRecordId && !breakdown ? (
                <Link
                  href={`/records/${stat.latestRecordId}`}
                  className="-mx-1 block rounded-lg px-1 py-0.5 active:bg-[var(--color-surface)]"
                >
                  {header}
                </Link>
              ) : (
                <div className="px-0.5">{body}</div>
              )}
              {stat.latestRecordId && breakdown && (
                <Link
                  href={`/records/${stat.latestRecordId}`}
                  className="mt-1 inline-block text-xs text-[var(--color-primary)]"
                >
                  直近の該当対局を見る
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--color-text-sub)]">
        棋譜内訳は評価値・候補手付き棋譜がある対局から自動集計します。
      </p>
    </section>
  );
}
