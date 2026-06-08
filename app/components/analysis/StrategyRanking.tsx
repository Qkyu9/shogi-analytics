import type { StrategyStat } from "@/app/lib/types";

function recordBreakdown(stat: StrategyStat): string {
  const parts: string[] = [];
  if (stat.wins > 0) parts.push(`${stat.wins}勝`);
  if (stat.losses > 0) parts.push(`${stat.losses}敗`);
  if (stat.draws > 0) parts.push(`${stat.draws}分`);
  return parts.join("・") || "0局";
}

export function StrategyRanking({
  title,
  stats,
  emptyMessage,
}: {
  title: string;
  stats: StrategyStat[];
  emptyMessage: string;
}) {
  if (stats.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        <p className="text-xs text-[var(--color-text-sub)]">{emptyMessage}</p>
      </section>
    );
  }

  const maxTotal = stats[0]?.total ?? 1;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
      <ul className="flex flex-col gap-4">
        {stats.map((stat) => (
          <li key={stat.strategy}>
            <div className="mb-1 flex items-start justify-between gap-2 text-sm">
              <span className="font-medium leading-snug">{stat.strategy}</span>
              <span className="shrink-0 text-right text-[var(--color-text-sub)]">
                <span className="block">{stat.total}局</span>
                <span className="block text-xs">
                  勝率 {stat.winRate}%（{recordBreakdown(stat)}）
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-sub)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${(stat.total / maxTotal) * 100}%` }}
                  title={`採用 ${stat.total}局`}
                />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-sub)]">
                <div
                  className="h-full rounded-full bg-[var(--color-success)]"
                  style={{ width: `${stat.winRate}%` }}
                  title={`勝率 ${stat.winRate}%`}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--color-text-sub)]">
        上段バー＝採用回数、下段バー＝勝率（勝ちの割合）
      </p>
    </section>
  );
}
