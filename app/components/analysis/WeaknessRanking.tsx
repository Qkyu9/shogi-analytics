import Link from "next/link";
import type { TagStat } from "@/app/lib/types";

export function WeaknessRanking({
  stats,
  lowDataWarning,
}: {
  stats: TagStat[];
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
          const content = (
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
              {stat.children && (
                <ul className="mt-1.5 flex flex-col gap-0.5 pl-3">
                  {stat.children.map((child) => (
                    <li
                      key={child.tag}
                      className="flex items-baseline justify-between gap-2 text-xs text-[var(--color-text-sub)]"
                    >
                      <span className="leading-snug">└ {child.tag}</span>
                      <span className="shrink-0">
                        {child.count}回 ({child.percentage}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          );

          return (
            <li key={stat.tag}>
              {stat.latestRecordId ? (
                <Link
                  href={`/records/${stat.latestRecordId}`}
                  className="-mx-1 block rounded-lg px-1 py-0.5 active:bg-[var(--color-surface)]"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--color-text-sub)]">
        行をタップすると直近の該当対局を開きます。
      </p>
    </section>
  );
}
