import type { PlayerSide } from "@/app/lib/handicap";
import {
  isActualMoveAt,
  parseKifuEngineFacts,
  type KifuEngineFacts,
} from "@/app/lib/kifu-engine-facts";
import {
  isUserMove,
  parseKifuWithEvals,
  toUserEval,
} from "@/app/lib/kifu-eval-parse";
import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import type { KishinInsight, KishinTurningPoint } from "@/app/lib/types";

const PLACEHOLDER_RE = /棋譜の候補手|（棋譜上の別手数の手のため候補として不適切）/;
const MOVE_NUM_RE = /(\d+)\s*手目/g;

export function sideFromTurningPoint(
  tp: KishinTurningPoint
): "sente" | "gote" {
  if (tp.move.startsWith("▲")) return "sente";
  if (tp.move.startsWith("△")) return "gote";
  return tp.moveNumber % 2 === 1 ? "sente" : "gote";
}

function bestCandidateForMove(
  facts: KifuEngineFacts,
  moveNumber: number
): string {
  const actual = facts.moveByNumber.get(moveNumber);
  const cands = facts.candidatesByNumber.get(moveNumber) ?? [];
  if (!actual) return cands[0] ?? "";
  return (
    cands.find(
      (c) => normalizeMoveToken(c) !== normalizeMoveToken(actual)
    ) ?? ""
  );
}

/** 本譜と候補手の対比文を棋譜データから組み立てる */
export function formatActualVsCandidateSentence(
  moveNumber: number,
  facts: KifuEngineFacts,
  tail = ""
): string {
  const actual = facts.moveByNumber.get(moveNumber);
  if (!actual) return tail.trim();

  const candidate = bestCandidateForMove(facts, moveNumber);
  const cleanedTail = tail
    .replace(PLACEHOLDER_RE, "")
    .replace(/\d+手目[^。]*?(?=。|$)/g, "")
    .replace(/^[。、,\s]+/, "")
    .trim();

  let base: string;
  if (candidate) {
    base = `${moveNumber}手目では本譜${actual}を指したが、候補手${candidate}の方が評価上優れていた`;
  } else {
    base = `${moveNumber}手目の${actual}`;
  }

  if (!cleanedTail) return `${base}。`;
  return `${base}。${cleanedTail.replace(/。+$/, "")}。`;
}

function extractMoveNumbers(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(MOVE_NUM_RE)) {
    nums.push(Number(m[1]));
  }
  return nums;
}

function enrichBriefSummaryLine(
  text: string,
  facts: KifuEngineFacts,
  index: number
): string {
  if (!text.trim()) return text;
  // 7項目目（教訓）はプレースホルダーが無ければそのまま
  if (index === 6 && !PLACEHOLDER_RE.test(text)) return text;

  const needsEnrich =
    PLACEHOLDER_RE.test(text) ||
    (/(\d+)\s*手目/.test(text) &&
      !/[▲△][^▲△、。，\s]+/.test(text.replace(PLACEHOLDER_RE, "")));

  if (!needsEnrich) return text;

  const moveNumber = extractMoveNumbers(text)[0];
  if (moveNumber == null) return text;

  const tail = text.replace(/\d+手目[^。]*?(?=。|$)/, "").trim();
  return formatActualVsCandidateSentence(moveNumber, facts, tail);
}

function enrichTurningPoint(
  tp: KishinTurningPoint,
  facts: KifuEngineFacts
): KishinTurningPoint {
  const actual = facts.moveByNumber.get(tp.moveNumber) ?? tp.move;
  const candidate = bestCandidateForMove(facts, tp.moveNumber);

  let topCandidate = tp.topCandidate.trim();
  if (!topCandidate || PLACEHOLDER_RE.test(topCandidate)) {
    topCandidate = candidate;
  } else if (
    candidate &&
    !isActualMoveAt(facts, tp.moveNumber, topCandidate) &&
    !facts.candidatesByNumber
      .get(tp.moveNumber)
      ?.some((c) => normalizeMoveToken(c) === normalizeMoveToken(topCandidate))
  ) {
    topCandidate = candidate;
  }

  let insight = tp.insight.trim();
  if (PLACEHOLDER_RE.test(insight) || !insight) {
    insight = formatActualVsCandidateSentence(
      tp.moveNumber,
      facts,
      insight.replace(PLACEHOLDER_RE, "")
    );
  } else if (PLACEHOLDER_RE.test(`${topCandidate}${insight}`)) {
    insight = formatActualVsCandidateSentence(tp.moveNumber, facts, insight);
  }

  return {
    ...tp,
    move: actual,
    topCandidate,
    insight,
  };
}

function buildTurningPointFromKifu(
  moveNumber: number,
  move: string,
  evalBefore: number,
  evalAfter: number,
  candidate: string | null,
  facts: KifuEngineFacts
): KishinTurningPoint {
  const evalChange = `${Math.round(evalBefore)} → ${Math.round(evalAfter)}`;
  const topCandidate =
    candidate &&
    normalizeMoveToken(candidate) !== normalizeMoveToken(move)
      ? candidate
      : bestCandidateForMove(facts, moveNumber);

  return enrichTurningPoint(
    {
      moveNumber,
      move,
      evalChange,
      topCandidate,
      insight: "",
    },
    facts
  );
}

/** 自分の手番の要所だけ残し、不足分を棋譜の評価変化から補完 */
export function filterAndSupplementTurningPoints(
  points: KishinTurningPoint[],
  kifuText: string,
  playerSide: PlayerSide | null
): KishinTurningPoint[] {
  const facts = parseKifuEngineFacts(kifuText);

  let filtered = playerSide
    ? points.filter((tp) => sideFromTurningPoint(tp) === playerSide)
    : points;

  filtered = filtered.map((tp) => enrichTurningPoint(tp, facts));

  if (!playerSide || filtered.length >= 3) {
    return filtered
      .sort((a, b) => a.moveNumber - b.moveNumber)
      .slice(0, 6);
  }

  const existing = new Set(filtered.map((p) => p.moveNumber));
  const parsed = parseKifuWithEvals(kifuText);
  const drops: Array<{
    moveNumber: number;
    move: string;
    evalBefore: number;
    evalAfter: number;
    candidate: string | null;
    userDelta: number;
  }> = [];

  for (let i = 0; i < parsed.length; i++) {
    const m = parsed[i];
    if (!isUserMove(m.side, playerSide)) continue;
    if (m.evalAfter == null) continue;
    const prev = parsed[i - 1]?.evalAfter ?? null;
    if (prev == null) continue;

    const userDelta =
      toUserEval(m.evalAfter, playerSide) - toUserEval(prev, playerSide);
    if (userDelta > -40) continue;

    drops.push({
      moveNumber: m.moveNumber,
      move: m.move,
      evalBefore: prev,
      evalAfter: m.evalAfter,
      candidate: m.candidate1Move,
      userDelta,
    });
  }

  drops.sort((a, b) => a.userDelta - b.userDelta);

  for (const d of drops) {
    if (filtered.length >= 6) break;
    if (existing.has(d.moveNumber)) continue;
    filtered.push(
      buildTurningPointFromKifu(
        d.moveNumber,
        d.move,
        d.evalBefore,
        d.evalAfter,
        d.candidate,
        facts
      )
    );
    existing.add(d.moveNumber);
  }

  return filtered.sort((a, b) => a.moveNumber - b.moveNumber).slice(0, 6);
}

/** 棋譜データで端的なまとめ・要所の指し手表記を具体化 */
export function enrichKishinInsight(
  insight: KishinInsight,
  kifuText: string
): KishinInsight {
  const facts = parseKifuEngineFacts(kifuText);

  return {
    ...insight,
    briefSummaries: insight.briefSummaries.map((s, i) =>
      s ? enrichBriefSummaryLine(s, facts, i) : s
    ),
    turningPoints: insight.turningPoints.map((tp) =>
      enrichTurningPoint(tp, facts)
    ),
  };
}
