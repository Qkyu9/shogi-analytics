import { PLAYER_SIDE_LABELS, type PlayerSide } from "@/app/lib/handicap";
import type { GameResult } from "@/app/lib/types";

export type KifuAnalysisContext = {
  playerSide: PlayerSide | null;
  result: GameResult | null;
};

const RESULT_LABELS: Record<GameResult, string> = {
  win: "勝ち（自分目線）",
  loss: "負け（自分目線）",
  draw: "引き分け（自分目線）",
};

/** 棋神示唆生成用：音声入力で記録した手番・勝敗をプロンプトに埋め込む */
export function buildKifuPlayerContextBlock(ctx: KifuAnalysisContext): string {
  const sideLine = ctx.playerSide
    ? `自分の手番: ${PLAYER_SIDE_LABELS[ctx.playerSide]}（▲=先手の手、△=後手の手。自分の手は${
        ctx.playerSide === "sente" ? "▲" : "△"
      }で示される）`
    : "自分の手番: 未記録（プレイヤー名で推測しない。▲=先手、△=後手として述べ、自分の手と断定しない）";

  const resultLine = ctx.result
    ? `対局結果: ${RESULT_LABELS[ctx.result]}`
    : "対局結果: 未記録";

  const evalGuide = ctx.playerSide
    ? ctx.playerSide === "sente"
      ? "評価値の解釈（自分=先手）: プラス=自分有利、マイナス=相手有利"
      : "評価値の解釈（自分=後手）: マイナス=自分有利、プラス=相手有利"
    : "評価値: エンジン標準どおりプラス=先手有利、マイナス=後手有利";

  return `【記録された対局情報（音声入力より・プレイヤー名は使わない）】
${sideLine}
${resultLine}
${evalGuide}

棋譜ヘッダの先手・後手のユーザー名は複数アカウントがあり特定できないため無視する。
上記の手番・勝敗だけを根拠に、自分（学習者）目線で示唆を書くこと。`;
}
