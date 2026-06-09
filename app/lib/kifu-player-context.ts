import { PLAYER_SIDE_LABELS, type PlayerSide } from "@/app/lib/handicap";
import type { GamePosition, GameResult } from "@/app/lib/types";

export type KifuAnalysisContext = {
  playerSide: PlayerSide | null;
  result: GameResult | null;
  /** 口頭要約テキスト（自分の狙いの引用用のみ。手の特定には使わない） */
  verbalSummaryText?: string | null;
};

const RESULT_LABELS: Record<GameResult, string> = {
  win: "勝ち（自分目線）",
  loss: "負け（自分目線）",
  draw: "引き分け（自分目線）",
};

/** 口頭要約の局面フィールドを1テキストにまとめる */
export function buildVerbalSummaryText(
  positions: GamePosition[]
): string | null {
  const blocks = positions
    .map((p, i) => {
      const parts = [
        p.sceneDescription.trim() && `局面: ${p.sceneDescription.trim()}`,
        p.defeatCause.trim() && `敗因・疑問: ${p.defeatCause.trim()}`,
        p.correctMove.trim() && `正着: ${p.correctMove.trim()}`,
        p.lesson.trim() && `教訓: ${p.lesson.trim()}`,
      ].filter(Boolean);
      if (parts.length === 0) return "";
      return `【口頭振り返り${i + 1}】\n${parts.join("\n")}`;
    })
    .filter(Boolean);

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}

export function buildVerbalSummaryBlock(text: string | null | undefined): string {
  if (!text?.trim()) {
    return `【口頭要約（音声入力）】
なし。自分が指した手の「狙い・意図」は書かない。棋譜と評価値・候補手の事実のみ述べる。`;
  }

  return `【口頭要約（音声入力）— 狙いの引用用のみ】
以下は学習者が音声で話した振り返り。**指し手の特定には使わない**。
ここに書かれた「狙い・意図」だけを、該当する手数の説明に引用してよい（要約・言い換え可）。
口頭要約にない狙いは推測で書いてはならない。

${text.trim()}`;
}

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
