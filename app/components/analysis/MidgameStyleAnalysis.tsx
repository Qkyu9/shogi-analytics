import { MIDGAME_READ_TAG } from "@/app/lib/weakness-tags";
import type { MidgameStyleAggregate } from "@/app/lib/midgame-style-analysis";

function MetricRow({
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
    <li className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
      <div
        className={`flex items-start justify-between gap-2 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="shrink-0 text-[var(--color-text-sub)]">
          {count}回 ({rate}%)
        </span>
      </div>
      {hint && !compact && (
        <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
          {hint}
        </p>
      )}
      {!compact && (
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-sub)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)]/80"
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
      )}
    </li>
  );
}

export function MidgameStyleAnalysis({
  metrics,
  linkedWeaknessTag,
  compact = false,
}: {
  metrics: MidgameStyleAggregate;
  linkedWeaknessTag?: string | null;
  compact?: boolean;
}) {
  const showLinkNote =
    linkedWeaknessTag === MIDGAME_READ_TAG ||
    linkedWeaknessTag?.includes("中盤の読み");

  const showStatus =
    metrics.dataStatus !== "ok" && metrics.statusMessage.length > 0;

  const metricsList = [
    {
      label: compact
        ? "不要な受け"
        : "不要な受け（候補手より評価が低い選択）",
      count: metrics.unnecessaryDefense,
      rate: metrics.unnecessaryDefenseRate,
      hint: "候補1より評価が低い手、または候補手と異なる手で評価が落ちた回数です。",
    },
    {
      label: compact ? "主導権喪失" : "主導権喪失（評価急落）",
      count: metrics.initiativeLoss,
      rate: metrics.initiativeLossRate,
      hint: "自分の手で評価が大きく落ちた回数の割合です。",
    },
    {
      label: compact
        ? "相手攻め後の受け"
        : "相手攻め後の受け（AI推測）",
      count: metrics.forcedDefenseInferred,
      rate: metrics.forcedDefenseRate,
      hint: "相手の攻めの後に、受け・守りの手を指した回数の割合です。",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-[var(--color-text-sub)]">
          棋譜分析（{metrics.gamesAnalyzed}局・自分の手
          {metrics.analyzedUserMoves}手）
        </p>
        {showStatus && (
          <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
            {metrics.statusMessage}
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {metricsList.map((m) => (
            <MetricRow key={m.label} {...m} compact />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          中盤棋風分析
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-sub)]">
          {showLinkNote
            ? `弱点「${MIDGAME_READ_TAG}」と関連する傾向を、棋譜の評価値・候補手から自動集計しています。`
            : "棋譜データがある対局から、攻めと受けの傾向を自動集計しています。"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          分析対象: {metrics.gamesAnalyzed}局（自分の手{" "}
          {metrics.analyzedUserMoves}手）
          {metrics.usedInsightFallback ? "・棋神示唆から推定" : ""}
        </p>
      </div>

      {showStatus && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {metrics.statusMessage}
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {metricsList.map((m) => (
          <MetricRow key={m.label} {...m} />
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
        ※ 棋譜に評価値がある対局を優先して集計します。評価値が読めない場合は棋神示唆の要所データを使います。
        相手攻め後の受けは、相手の攻め手のあとに受け・守りの手を指した回数です。
      </p>
    </section>
  );
}
