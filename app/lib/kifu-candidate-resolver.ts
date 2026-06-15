import { parseKifuEngineFacts } from "@/app/lib/kifu-engine-facts";
import { parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import {
  extractMarkedMoves,
  extractMoveDestination,
  resolveSameSquareSequence,
} from "@/app/lib/kifu-line-parse";
import {
  normalizeMoveToken,
  parseKifuMoveIndex,
} from "@/app/lib/kifu-move-index";

/** 棋譜全体の各手番の着地座標マップ（「同」も正しく解決） */
function buildResolvedDestinationMap(kifuText: string): Map<number, string> {
  const parsed = parseKifuWithEvals(kifuText);
  const destMap = new Map<number, string>();
  let prevDest: string | null = null;

  for (const m of parsed) {
    if (/^[▲△]同/.test(m.move)) {
      if (prevDest) destMap.set(m.moveNumber, prevDest);
    } else {
      const dest = extractMoveDestination(m.move);
      if (dest) {
        destMap.set(m.moveNumber, dest);
        prevDest = dest;
      }
    }
  }

  return destMap;
}

export function moveSideFromMark(move: string): "sente" | "gote" | null {
  if (move.startsWith("▲")) return "sente";
  if (move.startsWith("△")) return "gote";
  return null;
}

function isSameSide(a: string, b: string): boolean {
  const sa = moveSideFromMark(a);
  const sb = moveSideFromMark(b);
  if (!sa || !sb) return true;
  return sa === sb;
}

function pickCandidateFromList(
  candidates: string[],
  actual: string,
  requireSameSideAsActual: boolean
): string {
  for (const c of candidates) {
    if (normalizeMoveToken(c) === normalizeMoveToken(actual)) continue;
    if (requireSameSideAsActual && actual && !isSameSide(c, actual)) continue;
    return c;
  }
  return "";
}

function candidatesFromParsed(
  kifuText: string,
  moveNumber: number
): string[] {
  const parsed = parseKifuWithEvals(kifuText).find(
    (m) => m.moveNumber === moveNumber
  );
  if (!parsed?.candidate1Move) return [];
  return [parsed.candidate1Move];
}

/**
 * 要所の候補手を棋譜から解決する。
 * 棋神棋譜では「52手の候補」が51手目直後の解析行に付くことが多い。
 */
export function resolveCandidateForTurningPoint(
  moveNumber: number,
  kifuText: string,
  actualMove: string,
  fallback?: string
): string {
  const facts = parseKifuEngineFacts(kifuText);
  const actual = actualMove.trim();

  const fromFacts = pickCandidateFromList(
    facts.candidatesByNumber.get(moveNumber) ?? [],
    actual,
    true
  );
  if (fromFacts) return fromFacts;

  const reading = facts.readingLineByNumber.get(moveNumber);
  if (reading) {
    // reading line 内の「同」を直前の実戦手の着地点で座標解決
    const destMap = buildResolvedDestinationMap(kifuText);
    const prevDest = destMap.get(moveNumber - 1) ?? null;
    const resolvedMoves = resolveSameSquareSequence(
      extractMarkedMoves(reading),
      prevDest
    );
    for (const m of resolvedMoves) {
      if (normalizeMoveToken(m) === normalizeMoveToken(actual)) continue;
      if (actual && !isSameSide(m, actual)) continue;
      return m;
    }
  }

  const fromParsed = pickCandidateFromList(
    candidatesFromParsed(kifuText, moveNumber),
    actual,
    true
  );
  if (fromParsed) return fromParsed;

  const fb = fallback?.trim() ?? "";
  if (fb && normalizeMoveToken(fb) !== normalizeMoveToken(actual)) return fb;

  return "";
}

/** 要所に対応する読み筋（棋譜原文） */
export function resolveReadingForTurningPoint(
  moveNumber: number,
  kifuText: string
): string {
  const facts = parseKifuEngineFacts(kifuText);
  return facts.readingLineByNumber.get(moveNumber)?.trim() ?? "";
}

export function resolveActualMoveForTurningPoint(
  moveNumber: number,
  kifuText: string,
  fallback?: string
): string {
  const facts = parseKifuEngineFacts(kifuText);
  const fromFacts = facts.moveByNumber.get(moveNumber);
  if (fromFacts) return fromFacts;

  const fromIndex = parseKifuMoveIndex(kifuText).get(moveNumber);
  if (fromIndex) return fromIndex;

  const parsed = parseKifuWithEvals(kifuText).find(
    (m) => m.moveNumber === moveNumber
  );
  if (parsed?.move) return parsed.move;

  return fallback?.trim() ?? "";
}
