import type { PlayerSide } from "@/app/lib/handicap";

export type ParsedKifuMove = {
  moveNumber: number;
  side: "sente" | "gote";
  move: string;
  /** エンジン評価（先手有利がプラス） */
  evalAfter: number | null;
  candidate1Move: string | null;
  candidate1Eval: number | null;
};

function parseEvalToken(text: string): number | null {
  const m = text.match(/([+\-]?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (Number.isNaN(v)) return null;
  // 歩換算（±2以下）はセンチポーン相当に換算
  if (Math.abs(v) <= 20 && !Number.isInteger(v)) return Math.round(v * 100);
  if (Math.abs(v) <= 20 && String(m[1]).includes("."))
    return Math.round(v * 100);
  return Math.round(v);
}

function sideFromMoveNumber(moveNumber: number): "sente" | "gote" {
  return moveNumber % 2 === 1 ? "sente" : "gote";
}

function formatMove(sideMark: "▲" | "△", body: string): string {
  return `${sideMark}${body.replace(/^[▲△]/, "")}`;
}

function parseMoveLine(line: string): Omit<ParsedKifuMove, "evalAfter" | "candidate1Move" | "candidate1Eval"> | null {
  const withMark = line.match(
    /^(\d+)\s*[.．]?\s*([▲△])\s*(\S+?)(?:\([^)]*\))?/
  );
  if (withMark) {
    const moveNumber = Number(withMark[1]);
    const mark = withMark[2] as "▲" | "△";
    return {
      moveNumber,
      side: mark === "▲" ? "sente" : "gote",
      move: formatMove(mark, withMark[3]),
    };
  }

  const kifStyle = line.match(/^(\d+)\s*[.．]?\s*(\S+?)(?:\([^)]*\))?/);
  if (kifStyle) {
    const moveNumber = Number(kifStyle[1]);
    const body = kifStyle[2].replace(/^[▲△]/, "");
    if (!body || /^候補/.test(body)) return null;
    const side = sideFromMoveNumber(moveNumber);
    const mark = side === "sente" ? "▲" : "△";
    return {
      moveNumber,
      side,
      move: formatMove(mark, body),
    };
  }

  return null;
}

function parseInlineEval(line: string): number | null {
  const afterMove = line.match(
    /\)\s*([+\-]?\d+(?:\.\d+)?)\s*$/
  );
  if (afterMove) return parseEvalToken(afterMove[1]);

  const trailing = line.match(/\s([+\-]?\d+(?:\.\d+)?)\s*$/);
  if (trailing) return parseEvalToken(trailing[1]);

  return null;
}

function parseCandidateLine(line: string): {
  move: string;
  eval: number | null;
} | null {
  const match = line.match(
    /候補[１1]?\s*[:：]?\s*([▲△]?\S+?)(?:\([^)]*\))?\s*([+\-]?\d+(?:\.\d+)?)?/
  );
  if (!match) return null;

  let move = match[1].trim();
  if (!move) return null;
  if (!/^[▲△]/.test(move)) {
    move = `▲${move}`;
  }

  return {
    move,
    eval: match[2] ? parseEvalToken(match[2]) : null,
  };
}

/** 棋神棋譜から手数・評価・候補1を抽出 */
export function parseKifuWithEvals(kifuText: string): ParsedKifuMove[] {
  const moves: ParsedKifuMove[] = [];
  let current: ParsedKifuMove | null = null;
  const lines = kifuText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parsedMove = parseMoveLine(line);
    if (parsedMove) {
      if (current) moves.push(current);
      current = {
        ...parsedMove,
        evalAfter: parseInlineEval(line),
        candidate1Move: null,
        candidate1Eval: null,
      };

      if (current.evalAfter == null) {
        const next = lines[i + 1]?.trim() ?? "";
        if (/^[+\-]?\d+(?:\.\d+)?$/.test(next)) {
          current.evalAfter = parseEvalToken(next);
          i++;
        }
      }
      continue;
    }

    if (!current) continue;

    const candidate = parseCandidateLine(line);
    if (candidate) {
      current.candidate1Move = candidate.move;
      current.candidate1Eval = candidate.eval;
      continue;
    }

    if (current.evalAfter == null) {
      const evalOnly = parseEvalToken(line);
      if (evalOnly != null && /^[+\-]?\d/.test(line)) {
        current.evalAfter = evalOnly;
      }
    }
  }

  if (current) moves.push(current);
  return moves;
}

export function isUserMove(
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
