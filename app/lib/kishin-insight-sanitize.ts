import {
  isActualMoveAt,
  isCandidateForMove,
  moveExistsInKifu,
  parseKifuEngineFacts,
  type KifuEngineFacts,
} from "@/app/lib/kifu-engine-facts";
import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import type { KishinInsight, KishinTurningPoint } from "@/app/lib/types";

const MOVE_NUM_RE = /(\d+)\s*手目/g;
const MARKED_MOVE_RE = /([▲△][^▲△、。，\s]+)/g;

function moveNumbersInText(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(MOVE_NUM_RE)) {
    nums.push(Number(m[1]));
  }
  return nums;
}

function resolveReplacementMove(
  moveNumber: number | null,
  facts: KifuEngineFacts,
  prefer: "actual" | "candidate"
): string {
  if (moveNumber == null) return "";
  if (prefer === "actual") {
    return facts.moveByNumber.get(moveNumber) ?? "";
  }
  const actual = facts.moveByNumber.get(moveNumber);
  const cands = facts.candidatesByNumber.get(moveNumber) ?? [];
  if (!actual) return cands[0] ?? "";
  return (
    cands.find(
      (c) => normalizeMoveToken(c) !== normalizeMoveToken(actual)
    ) ??
    cands[0] ??
    actual
  );
}

function replaceHallucinatedMove(
  text: string,
  move: string,
  moveNumber: number | null,
  facts: KifuEngineFacts
): string {
  if (moveNumber != null) {
    if (isActualMoveAt(facts, moveNumber, move)) return text;
    if (isCandidateForMove(facts, moveNumber, move)) return text;
  }

  if (moveExistsInKifu(facts, move)) {
    if (moveNumber == null) return text;
    const replacement = resolveReplacementMove(moveNumber, facts, "actual");
    return replacement ? text.replace(move, replacement) : text.replace(move, "");
  }

  const replacement =
    resolveReplacementMove(moveNumber, facts, "candidate") ||
    resolveReplacementMove(moveNumber, facts, "actual");
  return replacement ? text.replace(move, replacement) : text.replace(move, "");
}

function sanitizeTextMoves(text: string, facts: KifuEngineFacts): string {
  let result = text;
  const moveNumbers = moveNumbersInText(text);
  const primaryMoveNum = moveNumbers[0] ?? null;

  for (const m of text.matchAll(MARKED_MOVE_RE)) {
    const move = m[1];
    result = replaceHallucinatedMove(result, move, primaryMoveNum, facts);
  }

  return result.replace(/\s{2,}/g, " ").replace(/、+/g, "、").trim();
}

function sanitizeTurningPoint(
  tp: KishinTurningPoint,
  facts: KifuEngineFacts
): KishinTurningPoint {
  const actual = facts.moveByNumber.get(tp.moveNumber) ?? tp.move;
  let topCandidate = tp.topCandidate.trim();

  if (topCandidate) {
    const candMoves = extractMarkedMoves(topCandidate);
    let sanitized = topCandidate;
    for (const cm of candMoves) {
      if (!isCandidateForMove(facts, tp.moveNumber, cm)) {
        const alt = resolveReplacementMove(tp.moveNumber, facts, "candidate");
        sanitized = alt ? topCandidate.replace(cm, alt) : topCandidate.replace(cm, "");
      }
    }
    topCandidate = sanitized.trim();
  }

  if (
    !topCandidate ||
    normalizeMoveToken(topCandidate) === normalizeMoveToken(actual)
  ) {
    topCandidate = resolveReplacementMove(tp.moveNumber, facts, "candidate");
  }

  return {
    ...tp,
    move: actual,
    insight: sanitizeTextMoves(tp.insight, facts),
    topCandidate,
  };
}

/** LLM出力から棋譜にない指し手・誤った候補手を除去・置換 */
export function sanitizeKishinInsight(
  insight: KishinInsight,
  kifuText: string
): KishinInsight {
  const facts = parseKifuEngineFacts(kifuText);

  return {
    ...insight,
    briefSummaries: insight.briefSummaries.map((s) =>
      s ? sanitizeTextMoves(s, facts) : s
    ),
    turningPoints: insight.turningPoints.map((tp) =>
      sanitizeTurningPoint(tp, facts)
    ),
  };
}
