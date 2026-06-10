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
      label: "主導権を取った手",
      count: metrics.initiativeTaken,
      rate: metrics.initiativeTakenRate,
      hint: "攻めが通り、相手に受けを強いる流れになった要所です。",
    },
    {
      label: "主導権を渡した手",
      count: metrics.initiativeLost,
      rate: metrics.initiativeLostRate,
      hint: "ここで流れが相手側に移った要所です。",
    },
    {
      label: "互角のままの綱引き",
      count: metrics.evenStruggle,
      rate: metrics.evenStruggleRate,
      hint: "大きな主導権の移動はないが、局面の要所として記録された手です。",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-[var(--color-text-sub)]">
          要所分析（{metrics.gamesAnalyzed}局・要所
          {metrics.turningPointCount}件）
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
          要所での好手・悪手
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-sub)]">
          {showLinkNote
            ? `弱点「${MIDGAME_READ_TAG}」と関連する傾向を、棋神示唆の要所から集計しています。`
            : "棋神示唆で抽出した要所を、主導権の増減ごとに分類しています。"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          分析対象: {metrics.gamesAnalyzed}局（要所{" "}
          {metrics.turningPointCount}件）
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {metricsList.map((m) => (
          <MetricRow key={m.label} {...m} />
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
        ※ 一局あたり3〜6件の要所を対象に、各要所を3区分のいずれか1つに分類しています。割合の分母は要所の件数です。
      </p>
    </section>
  );
}
