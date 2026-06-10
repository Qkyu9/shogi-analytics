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

  const metricsList = [
    {
      label: compact
        ? "不要な受け"
        : "不要な受け（候補手より評価が低い選択）",
      count: metrics.unnecessaryDefense,
      rate: metrics.unnecessaryDefenseRate,
      hint: "自分の手で、候補1より評価が大きく低い選択をした回数の割合です。",
    },
    {
      label: compact ? "主導権喪失" : "主導権喪失（有利から評価急落）",
      count: metrics.initiativeLoss,
      rate: metrics.initiativeLossRate,
      hint: "自分有利の局面から、1手で評価が大きく落ちた回数の割合です。",
    },
    {
      label: "受け強要率（AI推測）",
      count: metrics.forcedDefenseInferred,
      rate: metrics.forcedDefenseRate,
      hint: "攻め手を連続して指し、評価を維持できた区間の割合です（攻めの連続区間を分母）。",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-[var(--color-text-sub)]">
          棋譜分析（{metrics.gamesAnalyzed}局・自分の手
          {metrics.analyzedUserMoves}手）
        </p>
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
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {metricsList.map((m) => (
          <MetricRow key={m.label} {...m} />
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
        ※ 棋譜に評価値・候補手があり、先手/後手が記録された対局のみ対象です。
        受け強要率は攻めの連続と評価推移からの推測値です。
      </p>
    </section>
  );
}
