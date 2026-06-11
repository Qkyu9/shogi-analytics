/** 棋神棋譜の1行から手数・指し手を抽出（評価値は別行） */

export type ParsedNumberedMove = {
  moveNumber: number;
  side: "sente" | "gote";
  mark: "▲" | "△";
  move: string;
};

const MOVE_TOKEN_RE = /([▲△][^▲△\s、。，]+(?:\([^)]*\))?)/g;
const DIGIT = "[\\d０-９]+";

export function normalizeNumericText(text: string): string {
  return text
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30)
    )
    .replace(/[＋]/g, "+")
    .replace(/[－−―]/g, "-");
}

export function parseEvalToken(text: string): number | null {
  const normalized = normalizeNumericText(text);
  const m = normalized.match(/([+\-]?\d+(?:\.\d+)?)/);
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
  const withMark = line.match(
    new RegExp(`^(${DIGIT})\\s*[.．]?\\s*([▲△])\\s*([^\\s(]+)`)
  );
  if (withMark) {
    const moveNumber = Number(normalizeNumericText(withMark[1]));
    const mark = withMark[2] as "▲" | "△";
    const body = withMark[3].replace(/^[▲△]/, "");
    if (!body || /^候補|^\*\*|^[*＊]/.test(body)) return null;
    return {
      moveNumber,
      side: mark === "▲" ? "sente" : "gote",
      mark,
      move: formatMove(mark, body),
    };
  }

  const kifStyle = line.match(
    new RegExp(`^(${DIGIT})\\s*[.．]?\\s*([▲△]?)\\s*([^\\s(]+)`)
  );
  if (!kifStyle) return null;

  const body = kifStyle[3].replace(/^[▲△]/, "");
  if (!body || /^候補|^\*\*|^[*＊]/.test(body)) return null;

  const moveNumber = Number(normalizeNumericText(kifStyle[1]));
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
  const normalized = normalizeNumericText(line);
  const afterMove = normalized.match(/\)\s*([+\-]?\d+(?:\.\d+)?)\s*$/);
  if (afterMove) return parseEvalToken(afterMove[1]);

  const trailing = normalized.match(/\s([+\-]?\d+(?:\.\d+)?)\s*$/);
  if (trailing) return parseEvalToken(trailing[1]);

  return null;
}

/** Engine ブロック内の「評価値: +150」等 */
export function parseEngineEvalLine(line: string): number | null {
  const normalized = normalizeNumericText(line.trim());
  if (!/^評価/.test(normalized)) return null;
  const withColon = normalized.match(/[:：=]\s*([+\-]?\d+(?:\.\d+)?)/);
  if (withColon) return parseEvalToken(withColon[1]);
  return parseEvalToken(normalized.replace(/^評価値?/, ""));
}

/** 候補1行から指し手と評価を抽出 */
export function parseCandidateLine(line: string): {
  move: string;
  eval: number | null;
} | null {
  if (!/^候補(?:手)?[0-9０-９]/.test(line)) return null;

  const moves = extractMarkedMoves(line);
  if (moves.length > 0) {
    const normalized = normalizeNumericText(line);
    const parenEval = normalized.match(/\(([+\-]?\d+(?:\.\d+)?)\)/);
    const evalMatch =
      parenEval ?? normalized.match(/([+\-]?\d+(?:\.\d+)?)\s*$/);
    return {
      move: moves[0],
      eval: evalMatch ? parseEvalToken(evalMatch[1]) : null,
    };
  }

  const normalized = normalizeNumericText(line);
  const fallback = normalized.match(
    /候補(?:手)?[１1]?\s*[:：=]?\s*([▲△]?[^\s]+?)(?:\([^)]*\))?\s*([+\-]?\d+(?:\.\d+)?)?\s*$/
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

export type ParsedEngineComment = {
  evalAfter: number | null;
  candidate1Move: string | null;
  candidate1Eval: number | null;
};

/** 棋神/KIF の * Engine ... 評価値 ... 読み筋 ... 1行形式 */
export function parseEngineCommentLine(line: string): ParsedEngineComment {
  const trimmed = line.trim();
  const normalized = normalizeNumericText(trimmed);
  const empty = {
    evalAfter: null,
    candidate1Move: null,
    candidate1Eval: null,
  };
  if (!trimmed) return empty;

  // CSA: ** 30 -8384FU +2625FU
  const csaStyle = normalized.match(/^\*\*\s*([+\-]?\d+(?:\.\d+)?)\b/);
  if (csaStyle) {
    const moves = extractMarkedMoves(trimmed);
    return {
      evalAfter: parseEvalToken(csaStyle[1]),
      candidate1Move: moves[0] ?? null,
      candidate1Eval: null,
    };
  }

  let evalAfter: number | null = null;
  const evalMatch = normalized.match(/評価値\s*[=:]?\s*([+\-]?\d+(?:\.\d+)?)/);
  if (evalMatch) evalAfter = parseEvalToken(evalMatch[1]);

  let candidate1Move: string | null = null;
  let candidate1Eval: number | null = null;

  const candidate = parseCandidateLine(trimmed);
  if (candidate) {
    candidate1Move = candidate.move;
    candidate1Eval = candidate.eval;
  }

  const yomiMatch = trimmed.match(/読み筋\s*(.*)/);
  if (yomiMatch) {
    const moves = extractMarkedMoves(yomiMatch[1]);
    if (moves.length > 0) {
      candidate1Move = candidate1Move ?? moves[0];
    }
  }

  return { evalAfter, candidate1Move, candidate1Eval };
}

export function isEngineCommentLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\*\*\s*Engine/i.test(trimmed)) return true;
  if (/^[*＊]/.test(trimmed)) {
    return /Engine|解析|評価値|候補|読み筋|深さ|ノード/.test(trimmed);
  }
  if (/^評価/.test(trimmed)) return true;
  if (/^候補(?:手)?[0-9０-９]/.test(trimmed)) return true;
  if (/^深さ|^ノード|^時間/.test(trimmed)) return true;
  if (/^#/.test(trimmed) && /評価|候補|読み筋/.test(trimmed)) return true;
  return false;
}
