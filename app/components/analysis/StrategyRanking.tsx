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

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
      <ul className="flex flex-col gap-4">
        {stats.map((stat) => {
          const winBarPct = stat.winRate;

          return (
            <li key={stat.strategy}>
              <div className="mb-1.5 flex items-start justify-between gap-2 text-sm">
                <span className="font-medium leading-snug">{stat.strategy}</span>
                <span className="shrink-0 text-right text-[var(--color-text-sub)]">
                  <span className="font-medium text-[var(--color-text)]">
                    {stat.total}局
                  </span>
                  <span className="ml-1 text-xs">
                    勝率 {stat.winRate}%（{recordBreakdown(stat)}）
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-sub)]">
                {winBarPct > 0 && (
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${winBarPct}%` }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--color-text-sub)]">
        棒の長さ＝勝率（茶色）。0勝の戦型は棒が表示されません。
      </p>
    </section>
  );
}
