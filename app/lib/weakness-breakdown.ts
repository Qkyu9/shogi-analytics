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
  analyzedUserMoves: number;
  metrics: WeaknessBreakdownMetric[];
};

export function supportsWeaknessBreakdown(tag: string): boolean {
  return tag === MIDGAME_READ_TAG || tag.includes("中盤の読み");
}

/** 弱点タグごとの棋譜ベース内訳（将来タグを追加可能） */
export function getWeaknessBreakdown(
  tag: string,
  records: GameRecordDetail[]
): WeaknessBreakdown | null {
  if (!supportsWeaknessBreakdown(tag)) return null;

  const agg = aggregateMidgameStyleMetrics(records);
  if (!agg) return null;

  return {
    tag: MIDGAME_READ_TAG,
    gamesAnalyzed: agg.gamesAnalyzed,
    analyzedUserMoves: agg.analyzedUserMoves,
    metrics: [
      {
        label: "不要な受け",
        count: agg.unnecessaryDefense,
        rate: agg.unnecessaryDefenseRate,
        hint: "候補1より評価が低い選択",
      },
      {
        label: "主導権喪失",
        count: agg.initiativeLoss,
        rate: agg.initiativeLossRate,
        hint: "有利から評価急落",
      },
      {
        label: "受け強要率（AI推測）",
        count: agg.forcedDefenseInferred,
        rate: agg.forcedDefenseRate,
        hint: "攻め連続で評価維持",
      },
    ],
  };
}
