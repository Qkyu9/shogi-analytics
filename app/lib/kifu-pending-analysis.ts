import {
  extractMarkedMoves,
  parseEngineCommentLine,
  normalizeNumericText,
} from "@/app/lib/kifu-line-parse";

/** 次の手数行の直前に現れるエンジン解析（棋神 hisui 形式） */
export type PendingMoveAnalysis = {
  candidates: string[];
  readingLine: string;
};

export type PreMoveAnalysisState = {
  pending: PendingMoveAnalysis;
  /** 手数行の直前でエンジン解析ブロックを処理中 */
  active: boolean;
  /** 「読み筋」見出しの直後（続き行を取り込む） */
  afterReadingHeader: boolean;
};

export function createPendingMoveAnalysis(): PendingMoveAnalysis {
  return { candidates: [], readingLine: "" };
}

export function createPreMoveAnalysisState(): PreMoveAnalysisState {
  return {
    pending: createPendingMoveAnalysis(),
    active: false,
    afterReadingHeader: false,
  };
}

function extractInlineReadingLine(line: string): string {
  const match = line.match(/読み筋\s+(.*)$/);
  return match?.[1]?.trim() ?? "";
}

/** Engine行に候補・読み筋が同一行で含まれる棋神形式 */
export function hasInlineEngineAnalysis(line: string): boolean {
  return /読み筋/.test(line) || /候補(?:手)?[0-9０-９]/.test(line);
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

function appendReadingChunk(pending: PendingMoveAnalysis, chunk: string) {
  const trimmed = chunk.trim();
  if (!trimmed) return;
  pending.readingLine = pending.readingLine
    ? `${pending.readingLine} ${trimmed}`
    : trimmed;
  for (const m of extractMarkedMoves(trimmed)) {
    pushCandidate(pending, m);
  }
}

function isIgnorableEngineMetaLine(line: string): boolean {
  return /^深さ|^ノード|^時間|^NPS|^Hash|^TB|^seldepth|^multipv/i.test(
    line
  );
}

/**
 * 手数行の前に現れる行を解析状態に取り込む。
 * hisui 形式: 候補N → 評価値 → 読み筋 → （続き行）→ N手 指し手
 */
export function processPreMoveLine(
  state: PreMoveAnalysisState,
  line: string
): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (isEngineHeaderLine(trimmed) || (/Engine/i.test(trimmed) && hasInlineEngineAnalysis(trimmed))) {
    state.active = true;
    state.afterReadingHeader = false;
    const inlineReading = extractInlineReadingLine(trimmed);
    if (inlineReading) {
      appendReadingChunk(state.pending, inlineReading);
    }
    return;
  }

  if (isCandidateHeaderLine(trimmed)) {
    state.active = true;
    state.afterReadingHeader = false;
    const engine = parseEngineCommentLine(trimmed);
    if (engine.candidate1Move) pushCandidate(state.pending, engine.candidate1Move);
    return;
  }

  if (isEvalHeaderLine(trimmed)) {
    state.active = true;
    return;
  }

  if (isIgnorableEngineMetaLine(trimmed)) {
    state.active = true;
    return;
  }

  if (/読み筋/.test(trimmed)) {
    state.active = true;
    state.afterReadingHeader = true;
    appendReadingChunk(state.pending, extractReadingBody(trimmed));
    return;
  }

  if (state.active) {
    const moves = extractMarkedMoves(trimmed);
    if (moves.length > 0) {
      appendReadingChunk(state.pending, trimmed);
      state.afterReadingHeader = false;
      return;
    }

    if (state.afterReadingHeader) {
      appendReadingChunk(state.pending, trimmed);
      return;
    }

    if (/^[*＊#]/.test(trimmed)) {
      const engine = parseEngineCommentLine(trimmed);
      if (engine.candidate1Move) {
        pushCandidate(state.pending, engine.candidate1Move);
      }
      return;
    }

    const normalized = normalizeNumericText(trimmed);
    if (/^[+\-]?\d+(?:\.\d+)?$/.test(normalized)) {
      return;
    }
  }
}

/** @deprecated absorbEngineLine の後方互換 */
export function absorbEngineLine(
  pending: PendingMoveAnalysis,
  line: string
): boolean {
  const state = createPreMoveAnalysisState();
  state.pending = pending;
  const before = pending.readingLine + pending.candidates.join(",");
  processPreMoveLine(state, line);
  pending.candidates = state.pending.candidates;
  pending.readingLine = state.pending.readingLine;
  const after = pending.readingLine + pending.candidates.join(",");
  return before !== after || isEngineHeaderLine(line) || isCandidateHeaderLine(line) || isEvalHeaderLine(line) || /読み筋/.test(line);
}

export function sideMark(side: "sente" | "gote"): "▲" | "△" {
  return side === "sente" ? "▲" : "△";
}

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

export function resetPreMoveState(): PreMoveAnalysisState {
  return createPreMoveAnalysisState();
}

export function hasPendingContent(pending: PendingMoveAnalysis): boolean {
  return pending.candidates.length > 0 || pending.readingLine.length > 0;
}
