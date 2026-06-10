/** 棋神棋譜の1行から手数・指し手を抽出（評価値は別行） */

export type ParsedNumberedMove = {
  moveNumber: number;
  side: "sente" | "gote";
  mark: "▲" | "△";
  move: string;
};

const MOVE_TOKEN_RE = /([▲△][^▲△\s、。，]+(?:\([^)]*\))?)/g;

export function parseEvalToken(text: string): number | null {
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

function formatMove(mark: "▲" | "△", body: string): string {
  return `${mark}${body.replace(/^[▲△]/, "")}`;
}

/** テキストから符号付き指し手を抽出 */
export function extractMarkedMoves(text: string): string[] {
  const moves: string[] = [];
  for (const m of text.matchAll(MOVE_TOKEN_RE)) {
    const move = m[1].replace(/\([^)]*\)/g, "").trim();
    if (move) moves.push(move);
  }
  return moves;
}

/** 手の行から指し手本体を抽出（7六歩など全体を取る） */
export function parseNumberedMoveLine(line: string): ParsedNumberedMove | null {
  const withMark = line.match(/^(\d+)\s*[.．]?\s*([▲△])\s*([^\s(]+)/);
  if (withMark) {
    const moveNumber = Number(withMark[1]);
    const mark = withMark[2] as "▲" | "△";
    const body = withMark[3].replace(/^[▲△]/, "");
    if (!body || /^候補|^\*\*/.test(body)) return null;
    return {
      moveNumber,
      side: mark === "▲" ? "sente" : "gote",
      mark,
      move: formatMove(mark, body),
    };
  }

  const kifStyle = line.match(/^(\d+)\s*[.．]?\s*([▲△]?)\s*([^\s(]+)/);
  if (!kifStyle) return null;

  const body = kifStyle[3].replace(/^[▲△]/, "");
  if (!body || /^候補|^\*\*/.test(body)) return null;

  const moveNumber = Number(kifStyle[1]);
  const explicitMark = kifStyle[2] as "▲" | "△" | "";
  const side = explicitMark
    ? explicitMark === "▲"
      ? "sente"
      : "gote"
    : sideFromMoveNumber(moveNumber);
  const mark: "▲" | "△" = side === "sente" ? "▲" : "△";

  return {
    moveNumber,
    side,
    mark,
    move: formatMove(mark, body),
  };
}

/** 手の行末尾、または ) の直後にある評価値 */
export function parseInlineEval(line: string): number | null {
  const afterMove = line.match(/\)\s*([+\-]?\d+(?:\.\d+)?)\s*$/);
  if (afterMove) return parseEvalToken(afterMove[1]);

  const trailing = line.match(/\s([+\-]?\d+(?:\.\d+)?)\s*$/);
  if (trailing) return parseEvalToken(trailing[1]);

  return null;
}

/** Engine ブロック内の「評価値: +150」等 */
export function parseEngineEvalLine(line: string): number | null {
  if (!/^評価/.test(line)) return null;
  const withColon = line.match(/[:：]\s*([+\-]?\d+(?:\.\d+)?)/);
  if (withColon) return parseEvalToken(withColon[1]);
  return parseEvalToken(line.replace(/^評価値?/, ""));
}

/** 候補1行から指し手と評価を抽出 */
export function parseCandidateLine(line: string): {
  move: string;
  eval: number | null;
} | null {
  if (!/^候補[１1]?/.test(line)) return null;

  const moves = extractMarkedMoves(line);
  if (moves.length > 0) {
    const evalMatch = line.match(/([+\-]?\d+(?:\.\d+)?)\s*$/);
    return {
      move: moves[0],
      eval: evalMatch ? parseEvalToken(evalMatch[1]) : null,
    };
  }

  const fallback = line.match(
    /候補[１1]?\s*[:：]?\s*([▲△]?[^\s]+?)(?:\([^)]*\))?\s*([+\-]?\d+(?:\.\d+)?)?\s*$/
  );
  if (!fallback) return null;

  let move = fallback[1].trim();
  if (!move) return null;
  if (!/^[▲△]/.test(move)) move = `▲${move}`;

  return {
    move,
    eval: fallback[2] ? parseEvalToken(fallback[2]) : null,
  };
}
