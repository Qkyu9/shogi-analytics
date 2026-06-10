import type { WeaknessBreakdown } from "@/app/lib/weakness-breakdown";

function MetricLine({
  label,
  count,
  rate,
  compact,
}: {
  label: string;
  count: number;
  rate: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <span className="text-[var(--color-text)]">{label}</span>
      <span className="shrink-0 text-[var(--color-text-sub)]">
        {count}回 ({rate}%)
      </span>
    </div>
  );
}

/** 弱点タグ直下の棋譜分析内訳 */
export function WeaknessBreakdownDetail({
  breakdown,
  compact = false,
}: {
  breakdown: WeaknessBreakdown;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] ${
        compact ? "mt-2 space-y-1.5 p-2.5" : "mt-3 space-y-3 p-3"
      }`}
    >
      {!compact && (
        <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
          棋譜分析の内訳（{breakdown.gamesAnalyzed}局・自分の手
          {breakdown.analyzedUserMoves}手）
        </p>
      )}
      {compact && (
        <p className="text-[10px] text-[var(--color-text-sub)]">
          棋譜内訳（{breakdown.gamesAnalyzed}局）
        </p>
      )}
      <ul className={`flex flex-col ${compact ? "gap-1.5" : "gap-2.5"}`}>
        {breakdown.metrics.map((m) => (
          <li key={m.label}>
            <MetricLine
              label={m.label}
              count={m.count}
              rate={m.rate}
              compact={compact}
            />
            {!compact && m.hint && (
              <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
                {m.hint}
              </p>
            )}
            {!compact && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]/70"
                  style={{ width: `${Math.min(m.rate, 100)}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {!compact && (
        <p className="text-[10px] leading-relaxed text-[var(--color-text-sub)]">
          ※ 棋譜に評価・候補手があり先手/後手が記録された対局が対象
        </p>
      )}
    </div>
  );
}
