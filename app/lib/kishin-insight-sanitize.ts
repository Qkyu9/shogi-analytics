import {
  extractMarkedMoves,
  isActualMoveAt,
  isCandidateForMove,
  moveExistsInKifu,
  parseKifuEngineFacts,
  type KifuEngineFacts,
} from "@/app/lib/kifu-engine-facts";
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
    return text.replace(
      move,
      "（棋譜上の別手数の手のため候補として不適切）"
    );
  }

  if (moveNumber != null) {
    const cands = facts.candidatesByNumber.get(moveNumber) ?? [];
    if (cands.length > 0) {
      return text.replace(move, cands[0]);
    }
  }

  return text.replace(move, "棋譜の候補手");
}

function sanitizeTextMoves(text: string, facts: KifuEngineFacts): string {
  let result = text;
  const moveNumbers = moveNumbersInText(text);
  const primaryMoveNum = moveNumbers[0] ?? null;

  for (const m of text.matchAll(MARKED_MOVE_RE)) {
    const move = m[1];
    result = replaceHallucinatedMove(result, move, primaryMoveNum, facts);
  }

  return result
    .replace(/（棋譜上の別手数の手のため候補として不適切）/g, "棋譜の候補手")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeTurningPoint(
  tp: KishinTurningPoint,
  facts: KifuEngineFacts
): KishinTurningPoint {
  const move = tp.move;
  let topCandidate = tp.topCandidate;

  if (move && !isActualMoveAt(facts, tp.moveNumber, move)) {
    const actual = facts.moveByNumber.get(tp.moveNumber);
    if (actual) {
      // alignTurningPointsWithKifu で補正済みのはずだが念のため
    }
  }

  if (topCandidate) {
    const candMoves = extractMarkedMoves(topCandidate);
    let sanitized = topCandidate;
    for (const cm of candMoves) {
      if (!isCandidateForMove(facts, tp.moveNumber, cm)) {
        const alts = facts.candidatesByNumber.get(tp.moveNumber) ?? [];
        sanitized = alts[0]
          ? topCandidate.replace(cm, alts[0])
          : topCandidate.replace(cm, "棋譜の候補手");
      }
    }
    topCandidate = sanitized;
  }

  return {
    ...tp,
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
