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
      label: "受けを強要する好手",
      count: metrics.forcingAttackGood,
      rate: metrics.forcingAttackGoodRate,
      hint: "攻め手を連続して指し、評価を維持できた区間（相手に受けを強要できた好手）の割合です。",
    },
    {
      label: "劣勢での悪手",
      count: metrics.badMoveInDisadvantage,
      rate: metrics.badMoveInDisadvantageRate,
      hint: "すでに劣勢の局面から、さらに評価を落としてしまった手の割合です。",
    },
    {
      label: "優勢での悪手",
      count: metrics.badMoveInAdvantage,
      rate: metrics.badMoveInAdvantageRate,
      hint: "優勢の局面から、互角以下に評価を落としてしまった手の割合です。",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-[var(--color-text-sub)]">
          局面分析（{metrics.gamesAnalyzed}局・自分の手
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
          局面ごとの好手・悪手
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-sub)]">
          {showLinkNote
            ? `弱点「${MIDGAME_READ_TAG}」と関連する傾向を、棋譜の評価値から自動集計しています。`
            : "棋譜データがある対局から、好手（相手に攻めを強要）と悪手（優勢・劣勢での失点）を集計しています。"}
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
        好手は攻めの連続で評価を維持できた区間、悪手は優勢・劣勢それぞれで評価を悪化させた手です。
      </p>
    </section>
  );
}
