import type { TagStat } from "@/app/lib/types";

export function WeaknessRanking({
  stats,
  totalRecords,
  lowDataWarning,
}: {
  stats: TagStat[];
  totalRecords: number;
  lowDataWarning?: boolean;
}) {
  const maxCount = stats[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-4">
      {lowDataWarning && (
        <div className="rounded-lg bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-sub)]">
          記録が10件未満です。傾向は参考程度にご覧ください。
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {stats.map((stat) => (
          <li key={stat.tag}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
