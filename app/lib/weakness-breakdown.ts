import { aggregateMidgameStyleMetrics } from "@/app/lib/midgame-style-analysis";
import type { GameRecordDetail } from "@/app/lib/types";
import { MIDGAME_READ_TAG } from "@/app/lib/weakness-tags";

export type WeaknessBreakdownMetric = {
  label: string;
  count: number;
  rate: number;
  hint?: string;
};

export type WeaknessBreakdown = {
  tag: string;
  gamesAnalyzed: number;
  turningPointCount: number;
  metrics: WeaknessBreakdownMetric[];
  /** 棋譜はあるが要所が無い対局数 */
  skippedGames?: number;
};

export function supportsWeaknessBreakdown(tag: string): boolean {
  return tag === MIDGAME_READ_TAG || tag.includes("中盤の読み");
}

function countRecordsWithTurningPoints(records: GameRecordDetail[]): number {
  return records.filter(
    (r) => (r.kishinInsight?.turningPoints?.length ?? 0) > 0
  ).length;
}

function countKifuRecords(records: GameRecordDetail[]): number {
  return records.filter((r) => r.kifuText?.trim()).length;
}

/** 弱点タグごとの棋譜ベース内訳（将来タグを追加可能） */
export function getWeaknessBreakdown(
  tag: string,
  records: GameRecordDetail[]
): WeaknessBreakdown | null {
  if (!supportsWeaknessBreakdown(tag)) return null;

  const withTurningPoints = countRecordsWithTurningPoints(records);
  if (withTurningPoints === 0) return null;

  const agg = aggregateMidgameStyleMetrics(records);

  if (!agg) {
    const kifuCount = countKifuRecords(records);
    return {
      tag: MIDGAME_READ_TAG,
      gamesAnalyzed: 0,
      turningPointCount: 0,
      skippedGames: kifuCount,
      metrics: [
        { label: "主導権を取った手", count: 0, rate: 0 },
        { label: "主導権を渡した手", count: 0, rate: 0 },
        { label: "互角のままの綱引き", count: 0, rate: 0 },
      ],
    };
  }

  return {
    tag: MIDGAME_READ_TAG,
    gamesAnalyzed: agg.gamesAnalyzed,
    turningPointCount: agg.turningPointCount,
    skippedGames: Math.max(0, withTurningPoints - agg.gamesAnalyzed),
    metrics: [
      {
        label: "主導権を取った手",
        count: agg.initiativeTaken,
        rate: agg.initiativeTakenRate,
        hint: "攻めが通り受けを強いる流れ",
      },
      {
        label: "主導権を渡した手",
        count: agg.initiativeLost,
        rate: agg.initiativeLostRate,
        hint: "流れが相手側へ",
      },
      {
        label: "互角のままの綱引き",
        count: agg.evenStruggle,
        rate: agg.evenStruggleRate,
        hint: "大きな主導権移動なし",
      },
    ],
  };
}
