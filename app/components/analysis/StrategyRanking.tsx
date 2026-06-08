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
        {stats.map((stat) => {
          const widthPct = Math.max(
            (stat.total / maxTotal) * 100,
            stat.total > 0 ? 8 : 0
          );
          const winPct = stat.total > 0 ? (stat.wins / stat.total) * 100 : 0;
          const drawPct = stat.total > 0 ? (stat.draws / stat.total) * 100 : 0;
          const lossPct = stat.total > 0 ? (stat.losses / stat.total) * 100 : 0;

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
              <div className="h-3 w-full overflow-hidden rounded-sm bg-[var(--color-bg-sub)]">
                <div
                  className="flex h-full min-w-0 overflow-hidden rounded-sm"
                  style={{ width: `${widthPct}%` }}
                >
                  {winPct > 0 && (
                    <div
                      className="h-full bg-[var(--color-success)]"
                      style={{ width: `${winPct}%` }}
                    />
                  )}
                  {drawPct > 0 && (
                    <div
                      className="h-full bg-[var(--color-text-sub)]/45"
                      style={{ width: `${drawPct}%` }}
                    />
                  )}
                  {lossPct > 0 && (
                    <div
                      className="h-full bg-[var(--color-danger)]/75"
                      style={{ width: `${lossPct}%` }}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--color-text-sub)]">
        棒の長さ＝対局数の多さ、色＝勝敗（緑＝勝・赤＝敗・灰＝分）
      </p>
    </section>
  );
}
