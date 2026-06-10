import type { PlayerSide } from "@/app/lib/handicap";
import {
  extractMarkedMoves,
  isEngineCommentLine,
  normalizeNumericText,
  parseCandidateLine,
  parseEngineCommentLine,
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

function applyCandidate1(
  current: ParsedKifuMove,
  candidate: { move: string; eval: number | null }
) {
  if (current.candidate1Move != null) return;
  current.candidate1Move = candidate.move;
  current.candidate1Eval = candidate.eval;
}

function applyEngineComment(current: ParsedKifuMove, line: string) {
  const engine = parseEngineCommentLine(line);
  if (engine.evalAfter != null && current.evalAfter == null) {
    current.evalAfter = engine.evalAfter;
  }
  if (engine.candidate1Move) {
    applyCandidate1(current, {
      move: engine.candidate1Move,
      eval: engine.candidate1Eval,
    });
  }
}

/** 棋神棋譜から手数・評価・候補1を抽出 */
export function parseKifuWithEvals(kifuText: string): ParsedKifuMove[] {
  const moves: ParsedKifuMove[] = [];
  let current: ParsedKifuMove | null = null;
  let inEngineBlock = false;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      if (current) moves.push(current);
      current = {
        moveNumber: numbered.moveNumber,
        side: numbered.side,
        move: numbered.move,
        evalAfter: parseInlineEval(line),
        candidate1Move: null,
        candidate1Eval: null,
      };
      inEngineBlock = false;
      continue;
    }

    if (!current) continue;

    if (/^\*\*\s*Engine/i.test(line)) {
      inEngineBlock = true;
      continue;
    }

    if (/^#/.test(line) && isEngineCommentLine(line)) {
      applyEngineComment(current, line);
      continue;
    }

    if (isEngineCommentLine(line)) {
      applyEngineComment(current, line);
      if (/^[*＊]/.test(line) && /Engine|解析/.test(line)) {
        inEngineBlock = true;
      }
      continue;
    }

    if (inEngineBlock) {
      const engineEval = parseEngineEvalLine(line);
      if (engineEval != null && current.evalAfter == null) {
        current.evalAfter = engineEval;
        continue;
      }

      const candidate = parseCandidateLine(line);
      if (candidate) {
        applyCandidate1(current, candidate);
        continue;
      }

      if (/読み筋/.test(line)) {
        const body = line.replace(/^.*?読み筋\s*/, "");
        const marked = extractMarkedMoves(body);
        if (marked.length > 0 && current.candidate1Move == null) {
          applyCandidate1(current, { move: marked[0], eval: null });
        }
        continue;
      }

      if (/^深さ|^ノード|^時間/.test(line)) continue;

      if (new RegExp(`^${"[\\d０-９]+"}\\s`).test(line)) {
        inEngineBlock = false;
      }
      continue;
    }

    if (current.evalAfter == null) {
      const normalized = normalizeNumericText(line);
      if (/^[+\-]?\d+(?:\.\d+)?$/.test(normalized)) {
        current.evalAfter = parseEvalToken(line);
      }
    }
  }

  if (current) moves.push(current);
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
