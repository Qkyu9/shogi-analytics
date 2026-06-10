import type { WeaknessBreakdown } from "@/app/lib/weakness-breakdown";

function MetricLine({
  label,
  count,
  rate,
  hint,
  compact,
}: {
  label: string;
  count: number;
  rate: number;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
      <div
        className={`flex items-center justify-between gap-2 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <span className="font-semibold text-[var(--color-text)]">{label}</span>
        <span className="shrink-0 text-[var(--color-text-sub)]">
          {count}件 ({rate}%)
        </span>
      </div>
      {hint && !compact && (
        <p className="text-xs font-normal leading-relaxed text-[var(--color-text-sub)]">
          {hint}
        </p>
      )}
    </div>
  );
}

/** 弱点タグ直下の要所分析内訳 */
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
          要所分析の内訳（{breakdown.gamesAnalyzed}局・要所
          {breakdown.turningPointCount}件）
        </p>
      )}
      {compact && (
        <p className="text-[10px] text-[var(--color-text-sub)]">
          要所内訳（{breakdown.gamesAnalyzed}局・{breakdown.turningPointCount}
          件）
        </p>
      )}
      <ul className={`flex flex-col ${compact ? "gap-1.5" : "gap-2.5"}`}>
        {breakdown.metrics.map((m) => (
          <li key={m.label}>
            <MetricLine
              label={m.label}
              count={m.count}
              rate={m.rate}
              hint={m.hint}
              compact={compact}
            />
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
      {!compact && breakdown.skippedGames != null && breakdown.skippedGames > 0 && (
        <p className="text-[10px] text-[var(--color-text-sub)]">
          ※ {breakdown.skippedGames}局は棋神示唆の要所が未記録のため集計対象外
        </p>
      )}
      {!compact && (
        <p className="text-[10px] leading-relaxed text-[var(--color-text-sub)]">
          ※ 割合の分母は要所の件数です
        </p>
      )}
    </div>
  );
}
