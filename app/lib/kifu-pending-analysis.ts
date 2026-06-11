import {
  extractMarkedMoves,
  parseEngineCommentLine,
  parseEngineEvalLine,
} from "@/app/lib/kifu-line-parse";

/** 次の手数行の直前に現れるエンジン解析（棋神 hisui 形式） */
export type PendingMoveAnalysis = {
  candidates: string[];
  readingLine: string;
};

export function createPendingMoveAnalysis(): PendingMoveAnalysis {
  return { candidates: [], readingLine: "" };
}

export function isEngineHeaderLine(line: string): boolean {
  const t = line.trim();
  return /^\*\*\s*Engine/i.test(t) || /^Engine\s+/i.test(t);
}

export function isCandidateHeaderLine(line: string): boolean {
  return /^候補(?:手)?[0-9０-９]+/.test(line.trim());
}

export function isEvalHeaderLine(line: string): boolean {
  return /^評価/.test(line.trim());
}

export function extractReadingBody(line: string): string {
  return line.replace(/^.*?読み筋\s*[：:]?\s*/, "").trim();
}

function pushCandidate(pending: PendingMoveAnalysis, move: string) {
  if (!move) return;
  if (pending.candidates.includes(move)) return;
  pending.candidates.push(move);
}

/** 手数行の前に現れるエンジン行を pending に蓄積する */
export function absorbEngineLine(
  pending: PendingMoveAnalysis,
  line: string
): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (isEngineHeaderLine(trimmed)) return true;
  if (isCandidateHeaderLine(trimmed)) return true;
  if (isEvalHeaderLine(trimmed)) return true;

  if (/^深さ|^ノード|^時間|^NPS|^Hash|^TB/.test(trimmed)) return true;

  if (/読み筋/.test(trimmed)) {
    const body = extractReadingBody(trimmed);
    if (body) pending.readingLine = body;
    for (const m of extractMarkedMoves(body || trimmed)) {
      pushCandidate(pending, m);
    }
    return true;
  }

  if (/^[*＊#]/.test(trimmed) || /^候補/.test(trimmed)) {
    const engine = parseEngineCommentLine(trimmed);
    if (engine.candidate1Move) pushCandidate(pending, engine.candidate1Move);
    return true;
  }

  const evalOnly = parseEngineEvalLine(trimmed);
  if (evalOnly != null && /^評価/.test(trimmed)) return true;

  return false;
}

export function sideMark(side: "sente" | "gote"): "▲" | "△" {
  return side === "sente" ? "▲" : "△";
}

/** これから指す側の候補手を pending から選ぶ（読み筋の先頭手を優先） */
export function pickCandidateForSide(
  pending: PendingMoveAnalysis,
  side: "sente" | "gote",
  excludeMove?: string
): string {
  const mark = sideMark(side);
  const exclude = excludeMove?.replace(/\([^)]*\)/g, "").trim();

  const norm = (m: string) =>
    m.replace(/\([^)]*\)/g, "").replace(/\s+/g, "").toLowerCase();

  if (pending.readingLine) {
    for (const m of extractMarkedMoves(pending.readingLine)) {
      if (!m.startsWith(mark)) continue;
      if (exclude && norm(m) === norm(exclude)) continue;
      return m;
    }
  }

  for (const c of pending.candidates) {
    if (!c.startsWith(mark)) continue;
    if (exclude && norm(c) === norm(exclude)) continue;
    return c;
  }

  return "";
}

export function applyPendingToMaps(
  moveNumber: number,
  side: "sente" | "gote",
  actualMove: string,
  pending: PendingMoveAnalysis,
  addCandidate: (moveNumber: number, move: string) => void,
  setReading: (moveNumber: number, reading: string) => void
) {
  const candidate = pickCandidateForSide(pending, side, actualMove);
  if (candidate) addCandidate(moveNumber, candidate);
  if (pending.readingLine) setReading(moveNumber, pending.readingLine);
}
