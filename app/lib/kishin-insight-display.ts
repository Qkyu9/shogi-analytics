import {
  resolveActualMoveForTurningPoint,
  resolveCandidateForTurningPoint,
  resolveReadingForTurningPoint,
} from "@/app/lib/kifu-candidate-resolver";
import { parseKifuEngineFacts } from "@/app/lib/kifu-engine-facts";
import { parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import { parseKifuMoveIndex } from "@/app/lib/kifu-move-index";
import type {
  KishinDisplayModel,
  KishinDisplayTurningPoint,
  KishinInsight,
  KishinTurningPoint,
} from "@/app/lib/types";

export const MAX_KISHIN_TURNING_POINTS = 3;

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
  const storedRaw = insight.briefSummaries[5]?.trim();
  const transitionRaw = insight.briefSummaries[4]?.trim();

  if (storedRaw && storedRaw.length >= 12 && !looksLikeCoordinateOnly(storedRaw)) {
    let text = storedRaw.replace(/^終盤[、,]?\s*/, "");

    // 6項目目が「では」で始まる＝5項目目との接続文が分断されている
    if (/^では[、,]/.test(text) && transitionRaw && transitionRaw.length >= 8) {
      const transition = transitionRaw
        .replace(/^終盤[、,]?\s*/, "")
        .replace(/[。．]\s*$/, "");
      text = `${transition}。${text.replace(/^では[、,]\s*/, "")}`;
    } else {
      text = text.replace(/^では[、,]\s*/, "");
    }

    return text;
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

/** 読み筋テキストから候補手の流れを短く要約（持ち駒などの推測は含めない） */
function summarizeReadingFlow(readingLine: string): string {
  const moves = extractMarkedMoves(readingLine);
  if (moves.length === 0) return "";

  const labels = moves.slice(0, 4).map((m) => {
    const body = m.replace(/^[▲△]/, "");
    if (/打/.test(body)) return `${body.replace(/打.*/, "")}を打つ`;
    if (/角|馬/.test(body)) return "角を活かす";
    if (/飛|竜/.test(body)) return "飛車を活かす";
    if (/金/.test(body)) return "金を動かす";
    if (/銀/.test(body)) return "銀を動かす";
    if (/桂/.test(body)) return "桂を活かす";
    if (/玉|王/.test(body)) return "玉を動かす";
    return "攻めを続ける";
  });

  const unique = [...new Set(labels)];
  return `読み筋どおり${unique.join("、")}流れを作れる。`;
}

function buildIntentText(
  storedInsight: string,
  readingLine: string,
  candidateMove: string
): string {
  const ai = storedInsight.trim();
  if (ai) return ai;

  if (readingLine && candidateMove) {
    const flow = summarizeReadingFlow(readingLine);
    if (flow) return flow;
  }

  return "";
}

function buildDisplayTurningPoint(
  tp: KishinTurningPoint,
  kifuText: string
): KishinDisplayTurningPoint {
  const actualMove = resolveActualMoveForTurningPoint(
    tp.moveNumber,
    kifuText,
    tp.move
  );
  const candidateMove = resolveCandidateForTurningPoint(
    tp.moveNumber,
    kifuText,
    actualMove,
    tp.topCandidate
  );
  const readingLine = resolveReadingForTurningPoint(tp.moveNumber, kifuText);
  const intent = buildIntentText(tp.insight, readingLine, candidateMove);

  return {
    moveNumber: tp.moveNumber,
    actualMove,
    candidateMove,
    evalChange: tp.evalChange.trim(),
    readingLine,
    intent,
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
