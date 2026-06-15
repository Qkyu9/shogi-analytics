import type { PlayerSide } from "@/app/lib/handicap";
import {
  createPreMoveAnalysisState,
  hasPendingContent,
  pickCandidateForSide,
  processPreMoveLine,
  resetPreMoveState,
} from "@/app/lib/kifu-pending-analysis";
import {
  extractMoveDestination,
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
  evalAfter: number | null;
  candidate1Move: string | null;
  candidate1Eval: number | null;
};

/** 棋神 hisui 形式を含む棋譜から手数・評価・候補1を抽出 */
export function parseKifuWithEvals(kifuText: string): ParsedKifuMove[] {
  const moves: ParsedKifuMove[] = [];
  let preMove = createPreMoveAnalysisState();
  let lastEval: number | null = null;
  let prevDest: string | null = null; // 直前の実戦手の着地座標（「同」解決用）

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      // 手と手の間の評価値行（between-move eval）を前の手の evalAfter に補完
      // 棋神形式では評価値が指し手と別行のため、parseInlineEval だけでは null になる
      if (moves.length > 0 && moves[moves.length - 1].evalAfter === null && lastEval !== null) {
        moves[moves.length - 1] = { ...moves[moves.length - 1], evalAfter: lastEval };
      }

      const candidateMove =
        preMove.active || hasPendingContent(preMove.pending)
          ? pickCandidateForSide(
              preMove.pending,
              numbered.side,
              numbered.move,
              prevDest
            )
          : "";

      moves.push({
        moveNumber: numbered.moveNumber,
        side: numbered.side,
        move: numbered.move,
        evalAfter: parseInlineEval(line),
        candidate1Move: candidateMove || null,
        candidate1Eval: candidateMove ? lastEval : null,
      });

      // 「同」系は着地点が前と同じのため prevDest は更新しない
      const dest = extractMoveDestination(numbered.move);
      if (dest) prevDest = dest;

      preMove = resetPreMoveState();
      lastEval = null;
      continue;
    }

    processPreMoveLine(preMove, line);
    const evalVal = parseEngineEvalLine(line);
    if (evalVal != null) lastEval = evalVal;

    const normalized = normalizeNumericText(line);
    if (/^[+\-]?\d+(?:\.\d+)?$/.test(normalized)) {
      lastEval = parseEvalToken(line);
    }
  }

  // 最終手の evalAfter も between-move eval で補完
  if (moves.length > 0 && moves[moves.length - 1].evalAfter === null && lastEval !== null) {
    moves[moves.length - 1] = { ...moves[moves.length - 1], evalAfter: lastEval };
  }

  return moves;
}

export function isUserMove(
  moveSide: "sente" | "gote",
  playerSide: PlayerSide
): boolean {
  return moveSide === playerSide;
}

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
