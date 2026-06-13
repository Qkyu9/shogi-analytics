import Link from "next/link";
import type { StrategyStat } from "@/app/lib/types";

function recordBreakdown(stat: StrategyStat): string {
  const parts: string[] = [];
  if (stat.wins > 0) parts.push(`${stat.wins}勝`);
  if (stat.losses > 0) parts.push(`${stat.losses}敗`);
  if (stat.draws > 0) parts.push(`${stat.draws}分`);
  return parts.join("・") || "0局";
}

function StrategyHeader({ stat }: { stat: StrategyStat }) {
  const inner = (
    <>
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
        {stat.winRate > 0 && (
          <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{ width: `${stat.winRate}%` }}
          />
        )}
      </div>
    </>
  );

  return stat.latestRecordId ? (
    <Link
      href={`/records/${stat.latestRecordId}`}
      className="-mx-1 block rounded-lg px-1 py-0.5 active:bg-[var(--color-surface)]"
    >
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

function ChildRow({ stat }: { stat: StrategyStat }) {
  const inner = (
    <div className="flex items-baseline justify-between gap-2 text-xs text-[var(--color-text-sub)]">
      <span className="leading-snug">└ {stat.strategy}</span>
      <span className="shrink-0">
        {stat.total}局（{recordBreakdown(stat)}）
      </span>
    </div>
  );

  return (
    <li key={stat.strategy}>
      {stat.latestRecordId ? (
        <Link
          href={`/records/${stat.latestRecordId}`}
          className="-mx-0.5 block rounded px-0.5 active:bg-[var(--color-surface)]"
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
      {stat.children && (
        <ul className="mt-0.5 flex flex-col gap-0.5 pl-3">
          {stat.children.map((gc) => {
            const gcInner = (
              <div className="flex items-baseline justify-between gap-2 text-[10px] text-[var(--color-text-sub)] opacity-75">
                <span className="leading-snug">└ {gc.strategy}</span>
                <span className="shrink-0">{gc.total}局</span>
              </div>
            );
            return (
              <li key={gc.strategy}>
                {gc.latestRecordId ? (
                  <Link
                    href={`/records/${gc.latestRecordId}`}
                    className="-mx-0.5 block rounded px-0.5 active:bg-[var(--color-surface)]"
                  >
                    {gcInner}
                  </Link>
                ) : (
                  gcInner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function StrategyRanking({
  title,
  stats,
  emptyMessage,
  hideFooterNote = false,
}: {
  title: string;
  stats: StrategyStat[];
  emptyMessage: string;
  hideFooterNote?: boolean;
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
        {stats.map((stat) => (
          <li key={stat.strategy}>
            <StrategyHeader stat={stat} />
            {stat.children && (
              <ul className="mt-1.5 flex flex-col gap-0.5 pl-3">
                {stat.children.map((child) => (
                  <ChildRow key={child.strategy} stat={child} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {!hideFooterNote && (
        <p className="text-xs text-[var(--color-text-sub)]">
          棒の長さ＝勝率（茶色）。0勝の戦型は棒が表示されません。行をタップすると直近の該当対局を開きます。
        </p>
      )}
    </section>
  );
}
