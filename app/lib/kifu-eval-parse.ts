import type { PlayerSide } from "@/app/lib/handicap";
import {
  absorbEngineLine,
  createPendingMoveAnalysis,
  pickCandidateForSide,
} from "@/app/lib/kifu-pending-analysis";
import {
  normalizeNumericText,
  parseEngineEvalLine,
  parseEvalToken,
  parseInlineEval,
  parseNumberedMoveLine,
} from "@/app/lib/kifu-line-parse";

export type ParsedKifuMove = {
  moveNumber: number;
  side: "sente" | "gote";
  move: string;
  /** エンジン評価（先手有利がプラス） */
  evalAfter: number | null;
  candidate1Move: string | null;
  candidate1Eval: number | null;
};

/** 棋神 hisui 形式を含む棋譜から手数・評価・候補1を抽出 */
export function parseKifuWithEvals(kifuText: string): ParsedKifuMove[] {
  const moves: ParsedKifuMove[] = [];
  let pending = createPendingMoveAnalysis();
  let lastEval: number | null = null;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      const candidateMove = pickCandidateForSide(
        pending,
        numbered.side,
        numbered.move
      );

      moves.push({
        moveNumber: numbered.moveNumber,
        side: numbered.side,
        move: numbered.move,
        evalAfter: parseInlineEval(line),
        candidate1Move: candidateMove || null,
        candidate1Eval: candidateMove ? lastEval : null,
      });

      pending = createPendingMoveAnalysis();
      lastEval = null;
      continue;
    }

    if (absorbEngineLine(pending, line)) {
      const evalVal = parseEngineEvalLine(line);
      if (evalVal != null) lastEval = evalVal;
      continue;
    }

    const normalized = normalizeNumericText(line);
    if (/^[+\-]?\d+(?:\.\d+)?$/.test(normalized)) {
      lastEval = parseEvalToken(line);
    }
  }

  return moves;
}

export function isUserMove(
  moveSide: "sente" | "gote",
  playerSide: PlayerSide
): boolean {
  return moveSide === playerSide;
}

/** @deprecated 手数の奇偶で判定（▲△が信頼できる場合は isUserMove を使う） */
export function isUserMoveByNumber(
  moveNumber: number,
  playerSide: PlayerSide
): boolean {
  const senteMove = moveNumber % 2 === 1;
  return playerSide === "sente" ? senteMove : !senteMove;
}

export function toUserEval(rawEval: number, playerSide: PlayerSide): number {
  return playerSide === "sente" ? rawEval : -rawEval;
}

/** 攻め寄りの手か（受け強要率の推測用・簡易） */
export function isLikelyAttackMove(move: string): boolean {
  const body = move.replace(/^[▲△]/, "");
  if (/打/.test(body)) return true;
  if (/成/.test(body)) return true;
  if (/(突|越|寄|飛|角|桂|銀)/.test(body) && !/(退|引|戻)/.test(body)) return true;
  return false;
}

export function isLikelyDefensiveMove(move: string): boolean {
  const body = move.replace(/^[▲△]/, "");
  return /(退|引|戻|逃|戸|守|受)/.test(body);
}
