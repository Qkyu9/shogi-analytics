import type { PlayerSide } from "@/app/lib/handicap";
import {
  createPreMoveAnalysisState,
  hasPendingContent,
  pickCandidateForSide,
  processPreMoveLine,
  resetPreMoveState,
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
  evalAfter: number | null;
  candidate1Move: string | null;
  candidate1Eval: number | null;
};

/** 棋神 hisui 形式を含む棋譜から手数・評価・候補1を抽出 */
export function parseKifuWithEvals(kifuText: string): ParsedKifuMove[] {
  const moves: ParsedKifuMove[] = [];
  let preMove = createPreMoveAnalysisState();
  let lastEval: number | null = null;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      const candidateMove =
        preMove.active || hasPendingContent(preMove.pending)
          ? pickCandidateForSide(
              preMove.pending,
              numbered.side,
              numbered.move
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
