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
import {
  normalizeMoveToken,
  parseKifuMoveIndex,
} from "@/app/lib/kifu-move-index";
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import {
  dedupeTurningPoints,
  MAX_KISHIN_TURNING_POINTS,
} from "@/app/lib/kishin-insight-display";
import {
  resolveActualMoveForTurningPoint,
  resolveCandidateForTurningPoint,
} from "@/app/lib/kifu-candidate-resolver";
import { KISHIN_INSIGHT_FORMAT_VERSION } from "@/app/lib/prompts/summarize-kifu";
import type { KishinInsight, KishinTurningPoint } from "@/app/lib/types";

const PLACEHOLDER_RE = /棋譜の候補手|（棋譜上の別手数の手のため候補として不適切）/;
const EVAL_ONLY_RE =
  /評価(上|が)?(優|良|高|低|悪|下|上)|評価値|数値|マイナス|プラス/;

export function sideFromTurningPoint(
  tp: KishinTurningPoint
): "sente" | "gote" {
  if (tp.move.startsWith("▲")) return "sente";
  if (tp.move.startsWith("△")) return "gote";
  return tp.moveNumber % 2 === 1 ? "sente" : "gote";
}

function bestCandidateForMove(
  facts: KifuEngineFacts,
  moveNumber: number,
  actualOverride?: string
): string {
  const actual =
    actualOverride?.trim() || facts.moveByNumber.get(moveNumber) || "";
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
  facts: KifuEngineFacts,
  kifuText: string,
  fallback?: string
): string {
  const fromFacts = facts.moveByNumber.get(moveNumber);
  if (fromFacts) return fromFacts;

  const fromIndex = parseKifuMoveIndex(kifuText).get(moveNumber);
  if (fromIndex) return fromIndex;

  const parsed = parseKifuWithEvals(kifuText).find(
    (m) => m.moveNumber === moveNumber
  );
  if (parsed?.move) return parsed.move;

  const fb = fallback?.trim();
  if (fb) return fb;

  return "";
}

function resolveCandidateForMove(
  moveNumber: number,
  facts: KifuEngineFacts,
  kifuText: string,
  actual: string,
  fallback?: string
): string {
  const fromFacts = bestCandidateForMove(facts, moveNumber, actual);
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

function looksLikeCoordinateOnlyBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (!/\d+\s*手(?:目|の)/.test(t)) return false;
  if (!/[▲△]/.test(t)) return false;
  return lacksCandidateContrast(t);
}

const PIECE_RE = /(と|成香|成桂|成銀|成金|成飛|成角|馬|竜|歩|角|飛|金|銀|桂|香|玉|王)/;

/** 座標手を駒・動きの要約に変換 */
function describeMoveStrategically(move: string): string {
  const body = move.replace(/^[▲△]/, "");
  const pieceMatch = body.match(PIECE_RE);
  const piece = pieceMatch?.[1] ?? "駒";

  if (/打/.test(body)) {
    if (piece === "歩") return "歩を打つ";
    return `${piece}を打つ`;
  }
  if (/成/.test(body) && !/成香|成桂|成銀|成金|成飛|成角/.test(body)) {
    return `${piece}を成る`;
  }
  if (piece === "角" || piece === "馬") return "角を利かせる";
  if (piece === "飛" || piece === "竜") return "飛車を活かす";
  if (piece === "金" || piece === "成金") return "金を上がる形";
  if (piece === "銀" || piece === "成銀") return "銀を動かす";
  if (piece === "桂" || piece === "成桂") return "桂を跳ねる";
  if (piece === "香" || piece === "成香") return "香車を活かす";
  if (piece === "玉" || piece === "王") return "玉を動かす";
  if (piece === "歩" || piece === "と") return "歩を進める";
  return `${piece}を動かす`;
}

function summarizeReadingStrategically(readingLine: string): string {
  const moves = extractMarkedMoves(readingLine);
  if (moves.length === 0) return "";

  const themes = moves.slice(0, 4).map(describeMoveStrategically);
  const unique = [...new Set(themes)];

  if (unique.some((t) => t.includes("角"))) {
    return "角を軸に攻めを続けられる流れ";
  }
  if (unique.some((t) => t.includes("金"))) {
    return "金を連続して動かし自陣を固める流れ";
  }
  if (unique.some((t) => t.includes("飛"))) {
    return "飛車を活かして攻めを継続できる流れ";
  }
  if (unique.some((t) => t.includes("銀"))) {
    return "銀を連携させて局面を保てる流れ";
  }
  if (unique.some((t) => t.includes("桂"))) {
    return "桂を活かして展開を続けられる流れ";
  }
  return "読み筋どおりに攻めを続けられる流れ";
}

function stripEvalOnlyPhrases(text: string): string {
  return text
    .replace(/候補手[^。]*評価[^。]*/g, "")
    .replace(/評価上優れていた/g, "")
    .replace(/評価が[^。]*優れていた/g, "")
    .replace(/評価値[^。]*/g, "")
    .replace(/評価[^。]*(下落|上向|悪化|改善)[^。]*/g, "")
    .replace(/形勢を覆[^。]*/g, "")
    .replace(/^[。、,\s]+/, "")
    .trim();
}

function inferCandidateIntent(
  facts: KifuEngineFacts,
  moveNumber: number,
  candidate: string,
  tail: string
): string {
  const cleaned = stripEvalOnlyPhrases(tail);
  if (cleaned && !EVAL_ONLY_RE.test(cleaned)) return cleaned;

  const reading = facts.readingLineByNumber.get(moveNumber);
  if (reading) {
    const continuation = summarizeReadingStrategically(reading);
    if (continuation) return continuation;
  }

  const candTheme = describeMoveStrategically(candidate);
  if (candTheme.includes("角")) return "自陣を整えつつ相手の攻めを遅らせる流れ";
  if (candTheme.includes("金")) return "自陣を固めて形を保てる流れ";
  if (candTheme.includes("飛")) return "攻めを継続できる流れ";
  if (candTheme.includes("桂")) return "桂を活かして形を保てる流れ";

  return "本譜より局面を保ちやすい流れ";
}

/** 本譜と候補手の対比文を棋譜データから組み立てる */
export function formatActualVsCandidateSentence(
  moveNumber: number,
  facts: KifuEngineFacts,
  tail = "",
  options: {
    kifuText?: string;
    actualOverride?: string;
    candidateOverride?: string;
  } = {}
): string {
  const kifuText = options.kifuText ?? "";
  const tailMoves = extractMarkedMoves(tail);
  const actual =
    resolveActualMove(
      moveNumber,
      facts,
      kifuText,
      options.actualOverride ?? tailMoves[0]
    ) || tailMoves[0] || "";

  const candidate = resolveCandidateForMove(
    moveNumber,
    facts,
    kifuText,
    actual,
    options.candidateOverride
  );

  const cleanedTail = stripEvalOnlyPhrases(
    tail
      .replace(PLACEHOLDER_RE, "")
      .replace(/\d+手(?:目|の)?[^。]*?(?=。|$)/g, "")
      .replace(/[▲△][^▲△、。，\s]+/g, "")
  );

  if (!actual) {
    return `${moveNumber}手目の要所で局面の流れが大きく変わった。`;
  }

  if (!candidate) {
    const actualSummary = describeMoveStrategically(actual);
    if (!cleanedTail) {
      return `${moveNumber}手目では本譜どおり${actualSummary}を選んだ。`;
    }
    return `${moveNumber}手目では本譜どおり${actualSummary}を選んだ。${cleanedTail.replace(/。+$/, "")}。`;
  }

  const intent = inferCandidateIntent(
    facts,
    moveNumber,
    candidate,
    cleanedTail
  );
  const intentPhrase = intent.endsWith("。") ? intent.slice(0, -1) : intent;
  const actualSummary = describeMoveStrategically(actual);
  const candidateSummary = describeMoveStrategically(candidate);

  return `${moveNumber}手目では${actualSummary}を選んだが、${candidateSummary}手なら${intentPhrase}という狙いがあった。`;
}

function lacksCandidateContrast(text: string): boolean {
  return !/選んだが|なら|候補|と指せば|という狙い|手なら/.test(text);
}

function isEvalHeavyBrief(text: string): boolean {
  return /評価値|評価が|評価上|形勢を覆|上向かず|下落|悪化/.test(text);
}

function hasCoordinateMoveNotation(text: string): boolean {
  return /[▲△][^▲△、。，\s]+/.test(text) || /本譜/.test(text);
}

function enrichTurningPoint(
  tp: KishinTurningPoint,
  facts: KifuEngineFacts,
  kifuText: string
): KishinTurningPoint {
  const actual = resolveActualMoveForTurningPoint(
    tp.moveNumber,
    kifuText,
    tp.move
  );
  const candidate = resolveCandidateForTurningPoint(
    tp.moveNumber,
    kifuText,
    actual,
    tp.topCandidate
  );

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
  const insightNeedsRewrite =
    !insight ||
    PLACEHOLDER_RE.test(insight) ||
    /評価上優れ|候補手.*評価|方が評価/.test(insight) ||
    (isEvalHeavyBrief(insight) && lacksCandidateContrast(insight)) ||
    (hasCoordinateMoveNotation(insight) && lacksCandidateContrast(insight)) ||
    looksLikeCoordinateOnlyBrief(insight);

  if (insightNeedsRewrite) {
    insight = formatActualVsCandidateSentence(
      tp.moveNumber,
      facts,
      insight.replace(PLACEHOLDER_RE, ""),
      {
        kifuText,
        actualOverride: actual,
        candidateOverride: topCandidate,
      }
    );
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
  facts: KifuEngineFacts,
  kifuText: string
): KishinTurningPoint {
  const evalChange = `${Math.round(evalBefore)} → ${Math.round(evalAfter)}`;
  const topCandidate =
    candidate &&
    normalizeMoveToken(candidate) !== normalizeMoveToken(move)
      ? candidate
      : bestCandidateForMove(facts, moveNumber, move);

  return enrichTurningPoint(
    {
      moveNumber,
      move,
      evalChange,
      topCandidate,
      insight: "",
    },
    facts,
    kifuText
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

  filtered = filtered.map((tp) => enrichTurningPoint(tp, facts, kifuText));

  if (filtered.length >= MAX_KISHIN_TURNING_POINTS) {
    return dedupeTurningPoints(
      filtered.sort((a, b) => a.moveNumber - b.moveNumber)
    );
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
    // playerSide が判明している場合はその手番のみ、不明な場合は両手番から抽出
    if (playerSide && !isUserMove(m.side, playerSide)) continue;
    if (m.evalAfter == null) continue;
    const prev = parsed[i - 1]?.evalAfter ?? null;
    if (prev == null) continue;

    const userDelta = playerSide
      ? toUserEval(m.evalAfter, playerSide) - toUserEval(prev, playerSide)
      : -(Math.abs(m.evalAfter - prev)); // 手番不明時は評価値変動の絶対値を使用
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
    if (filtered.length >= MAX_KISHIN_TURNING_POINTS) break;
    if (existing.has(d.moveNumber)) continue;
    filtered.push(
      buildTurningPointFromKifu(
        d.moveNumber,
        d.move,
        d.evalBefore,
        d.evalAfter,
        d.candidate,
        facts,
        kifuText
      )
    );
    existing.add(d.moveNumber);
  }

  return dedupeTurningPoints(
    filtered.sort((a, b) => a.moveNumber - b.moveNumber)
  );
}

/** 棋譜データで要所の指し手・候補を具体化（表示は buildKishinDisplay が担当） */
export function enrichKishinInsight(
  insight: KishinInsight,
  kifuText: string,
  playerSide?: PlayerSide | null
): KishinInsight {
  const facts = parseKifuEngineFacts(kifuText);
  const enriched = insight.turningPoints.map((tp) =>
    enrichTurningPoint(tp, facts, kifuText)
  );
  let turningPoints = dedupeTurningPoints(enriched);

  // 旧MAX=3で保存された既存記録を棋譜から補完（AI再呼び出しなし）
  // playerSide が明示的に渡された場合のみ実行（summarize-kifu API からの呼び出しは対象外）
  if (playerSide !== undefined && turningPoints.length < MAX_KISHIN_TURNING_POINTS) {
    turningPoints = filterAndSupplementTurningPoints(
      turningPoints,
      kifuText,
      playerSide
    );
  }

  return {
    ...insight,
    insightFormatVersion: KISHIN_INSIGHT_FORMAT_VERSION,
    turningPoints,
  };
}
