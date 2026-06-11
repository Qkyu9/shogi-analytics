import { parseKifuEngineFacts } from "@/app/lib/kifu-engine-facts";
import { parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import {
  normalizeMoveToken,
  parseKifuMoveIndex,
} from "@/app/lib/kifu-move-index";

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

  const lookupOrder =
    moveNumber > 1
      ? [moveNumber - 1, moveNumber, moveNumber + 1]
      : [moveNumber, moveNumber + 1];

  for (const n of lookupOrder) {
    if (n < 1) continue;

    const fromFacts = pickCandidateFromList(
      facts.candidatesByNumber.get(n) ?? [],
      actual,
      true
    );
    if (fromFacts) return fromFacts;

    const fromParsed = pickCandidateFromList(
      candidatesFromParsed(kifuText, n),
      actual,
      true
    );
    if (fromParsed) return fromParsed;

    const reading = facts.readingLineByNumber.get(n);
    if (reading) {
      for (const m of extractMarkedMoves(reading)) {
        if (normalizeMoveToken(m) === normalizeMoveToken(actual)) continue;
        if (actual && !isSameSide(m, actual)) continue;
        return m;
      }
    }
  }

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
  const order =
    moveNumber > 1
      ? [moveNumber - 1, moveNumber, moveNumber + 1]
      : [moveNumber, moveNumber + 1];

  for (const n of order) {
    if (n < 1) continue;
    const reading = facts.readingLineByNumber.get(n)?.trim();
    if (reading) return reading;
  }
  return "";
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
