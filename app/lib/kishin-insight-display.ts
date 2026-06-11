import { parseKifuEngineFacts } from "@/app/lib/kifu-engine-facts";
import { parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import {
  normalizeMoveToken,
  parseKifuMoveIndex,
} from "@/app/lib/kifu-move-index";
import type {
  KishinDisplayModel,
  KishinDisplayTurningPoint,
  KishinInsight,
  KishinTurningPoint,
} from "@/app/lib/types";

export const MAX_KISHIN_TURNING_POINTS = 3;

function bestCandidateForMove(
  moveNumber: number,
  actual: string,
  facts: ReturnType<typeof parseKifuEngineFacts>
): string {
  const cands = facts.candidatesByNumber.get(moveNumber) ?? [];
  if (!actual) return cands[0] ?? "";
  return (
    cands.find(
      (c) => normalizeMoveToken(c) !== normalizeMoveToken(actual)
    ) ?? ""
  );
}

function resolveActualMove(
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

function resolveCandidateMove(
  moveNumber: number,
  kifuText: string,
  actual: string,
  fallback?: string
): string {
  const facts = parseKifuEngineFacts(kifuText);
  const fromFacts = bestCandidateForMove(moveNumber, actual, facts);
  if (fromFacts) return fromFacts;

  const parsed = parseKifuWithEvals(kifuText).find(
    (m) => m.moveNumber === moveNumber
  );
  if (parsed?.candidate1Move) {
    const c = parsed.candidate1Move.trim();
    if (c && normalizeMoveToken(c) !== normalizeMoveToken(actual)) return c;
  }

  const reading = facts.readingLineByNumber.get(moveNumber);
  if (reading) {
    for (const m of extractMarkedMoves(reading)) {
      if (normalizeMoveToken(m) !== normalizeMoveToken(actual)) return m;
    }
  }

  const fb = fallback?.trim() ?? "";
  if (fb && normalizeMoveToken(fb) !== normalizeMoveToken(actual)) return fb;

  return "";
}

/** 手数の重複を除き、最大件数までに絞る */
export function dedupeTurningPoints(
  points: KishinTurningPoint[],
  max = MAX_KISHIN_TURNING_POINTS
): KishinTurningPoint[] {
  const seen = new Set<number>();
  const result: KishinTurningPoint[] = [];

  for (const tp of [...points].sort((a, b) => a.moveNumber - b.moveNumber)) {
    if (seen.has(tp.moveNumber)) continue;
    seen.add(tp.moveNumber);
    result.push(tp);
  }

  return result.slice(0, max);
}

function buildOpeningSummary(kifuText: string): string {
  const parsed = parseKifuWithEvals(kifuText).slice(0, 24);
  const pieces = new Set<string>();

  for (const m of parsed) {
    const body = m.move.replace(/^[▲△]/, "");
    if (/角|馬/.test(body)) pieces.add("角");
    if (/飛|竜/.test(body)) pieces.add("飛車");
    if (/銀/.test(body)) pieces.add("銀");
    if (/桂/.test(body)) pieces.add("桂");
    if (/香/.test(body)) pieces.add("香");
    if (/金/.test(body)) pieces.add("金");
  }

  const active = [...pieces];
  if (active.length >= 2) {
    return `双方が駒組みを進める中で、${active.slice(0, 3).join("や")}が活発に動き出す展開となった。`;
  }
  if (active.length === 1) {
    return `双方が駒組みを進める中で、${active[0]}を中心に組み立てが進んだ。`;
  }
  return "双方が駒組みを整えながら互角の展開となった。";
}

function looksLikeCoordinateOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^\d+手(?:目|の)/.test(t) && /[▲△]/.test(t) && !/選んだ|なら|狙い/.test(t)) {
    return true;
  }
  return false;
}

function extractEndgameText(insight: KishinInsight, kifuText: string): string {
  const stored = insight.briefSummaries[5]?.trim();
  if (stored && stored.length >= 12 && !looksLikeCoordinateOnly(stored)) {
    return stored.replace(/^終盤[、,]?\s*/, "");
  }

  const index = parseKifuMoveIndex(kifuText);
  const facts = parseKifuEngineFacts(kifuText);
  const entries =
    index.size > 0 ? [...index.entries()] : [...facts.moveByNumber.entries()];
  const last = entries.sort((a, b) => b[0] - a[0])[0];
  if (last) {
    return `${last[0]}手目付近まで攻防が続き、決着に至った。`;
  }

  return "終盤の攻防を経て決着した。";
}

function extractLessonText(insight: KishinInsight): string {
  const lesson = insight.briefSummaries[6]?.trim();
  if (lesson && lesson.length >= 8) return lesson;

  const fallback = [...insight.briefSummaries]
    .reverse()
    .find((s) => s.trim().length >= 8 && /教訓|重要|学/.test(s));
  return fallback?.trim() ?? "";
}

function buildDisplayTurningPoint(
  tp: KishinTurningPoint,
  kifuText: string
): KishinDisplayTurningPoint {
  const actualMove = resolveActualMove(tp.moveNumber, kifuText, tp.move);
  const candidateMove = resolveCandidateMove(
    tp.moveNumber,
    kifuText,
    actualMove,
    tp.topCandidate
  );

  return {
    moveNumber: tp.moveNumber,
    actualMove,
    candidateMove,
    evalChange: tp.evalChange.trim(),
    intent: tp.insight.trim(),
  };
}

/** 棋譜＋保存データから表示用モデルを組み立てる（第1段階） */
export function buildKishinDisplay(
  insight: KishinInsight,
  kifuText: string
): KishinDisplayModel {
  const turningPoints = dedupeTurningPoints(insight.turningPoints).map((tp) =>
    buildDisplayTurningPoint(tp, kifuText)
  );

  return {
    opening: buildOpeningSummary(kifuText),
    turningPoints,
    endgame: extractEndgameText(insight, kifuText),
    lesson: extractLessonText(insight),
  };
}
