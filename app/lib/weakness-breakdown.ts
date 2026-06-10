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
  /** 棋譜はあるが集計できなかった対局数 */
  skippedGames?: number;
  statusMessage?: string;
};

export function supportsWeaknessBreakdown(tag: string): boolean {
  return tag === MIDGAME_READ_TAG || tag.includes("中盤の読み");
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

  const kifuCount = countKifuRecords(records);
  if (kifuCount === 0) return null;

  const agg = aggregateMidgameStyleMetrics(records);

  if (!agg) {
    return {
      tag: MIDGAME_READ_TAG,
      gamesAnalyzed: 0,
      analyzedUserMoves: 0,
      skippedGames: kifuCount,
      metrics: [
        { label: "不要な受け", count: 0, rate: 0 },
        { label: "主導権喪失", count: 0, rate: 0 },
        { label: "相手攻め後の受け（AI推測）", count: 0, rate: 0 },
      ],
    };
  }

  return {
    tag: MIDGAME_READ_TAG,
    gamesAnalyzed: agg.gamesAnalyzed,
    analyzedUserMoves: agg.analyzedUserMoves,
    skippedGames: Math.max(0, kifuCount - agg.gamesAnalyzed),
    statusMessage: agg.statusMessage,
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
        label: "相手攻め後の受け（AI推測）",
        count: agg.forcedDefenseInferred,
        rate: agg.forcedDefenseRate,
        hint: "相手攻めの後に受け・守り",
      },
    ],
  };
}
