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
import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";
import type { KishinInsight, KishinTurningPoint } from "@/app/lib/types";

const PLACEHOLDER_RE = /棋譜の候補手|（棋譜上の別手数の手のため候補として不適切）/;
const MOVE_NUM_RE = /(\d+)\s*手(?:目|の)?/g;
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
  tail = ""
): string {
  const actual = facts.moveByNumber.get(moveNumber);
  if (!actual) return tail.trim();

  const candidate = bestCandidateForMove(facts, moveNumber);
  const cleanedTail = stripEvalOnlyPhrases(
    tail
      .replace(PLACEHOLDER_RE, "")
      .replace(/\d+手(?:目|の)?[^。]*?(?=。|$)/g, "")
  );

  if (!candidate) {
    const actualSummary = describeMoveStrategically(actual);
    if (!cleanedTail) {
      return `${moveNumber}手目では${actualSummary}を選んだ。`;
    }
    return `${moveNumber}手目では${actualSummary}を選んだ。${cleanedTail.replace(/。+$/, "")}。`;
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

function extractMoveNumbers(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(MOVE_NUM_RE)) {
    nums.push(Number(m[1]));
  }
  return nums;
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

function isIncompleteBrief(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 10) return true;
  if (/^(序盤|中盤|終盤)[^。]*[、,]\s*\.?$/.test(t)) return true;
  if (/^(序盤|中盤|終盤)では[、,。\s]*$/.test(t)) return true;
  return false;
}

function needsBriefSummaryRewrite(text: string, index: number): boolean {
  if (isIncompleteBrief(text)) return true;
  if (PLACEHOLDER_RE.test(text)) return true;

  if (index === 0) {
    return (
      /[０-９0-9一二三四五六七八九]+[歩と香桂銀金角飛]|歩の突|▲|△|本譜/.test(
        text
      )
    );
  }

  if (index === 6) {
    return false;
  }

  if (isEvalHeavyBrief(text) && lacksCandidateContrast(text)) return true;
  if (hasCoordinateMoveNotation(text) && lacksCandidateContrast(text)) {
    return true;
  }
  if (extractMoveNumbers(text).length > 0 && lacksCandidateContrast(text)) {
    return true;
  }

  return false;
}

/** 序盤1項目目：座標手なしの展開要約 */
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
    return `序盤は、双方が駒組みを進める中で、${active.slice(0, 3).join("や")}が活発に動き出す展開となった。`;
  }
  if (active.length === 1) {
    return `序盤は、双方が駒組みを進める中で、${active[0]}を中心に組み立てが進んだ。`;
  }
  return "序盤は、双方が駒組みを整えながら互角の展開となった。";
}

function buildMidgameTransitionSummary(
  turningPoints: KishinTurningPoint[],
  facts: KifuEngineFacts
): string {
  const tp = turningPoints[Math.min(3, turningPoints.length - 1)];
  if (tp) {
    return formatActualVsCandidateSentence(
      tp.moveNumber,
      facts,
      stripEvalOnlyPhrases(tp.insight)
    );
  }
  return "中盤以降、形勢の主導権が入り替わる展開となった。";
}

function buildEndgameSummary(
  kifuText: string,
  facts: KifuEngineFacts
): string {
  const entries = [...facts.moveByNumber.entries()].sort((a, b) => b[0] - a[0]);
  const last = entries[0];
  if (last) {
    const [n, move] = last;
    return `終盤、${n}手目付近の${describeMoveStrategically(move)}が決着の流れを形作った。`;
  }

  const parsed = parseKifuWithEvals(kifuText);
  const tail = parsed[parsed.length - 1];
  if (tail) {
    return `終盤、${tail.moveNumber}手目付近で${describeMoveStrategically(tail.move)}が決着に関わった。`;
  }

  return "終盤、互いの王将攻防が続く展開で決着した。";
}

function sentenceFromTurningPoint(
  tp: KishinTurningPoint,
  facts: KifuEngineFacts
): string {
  return formatActualVsCandidateSentence(
    tp.moveNumber,
    facts,
    stripEvalOnlyPhrases(tp.insight)
  );
}

/**
 * 端的なまとめ7項目を要所データベースで再構成する。
 * LLMが座標・評価値だけを返しても、ここで方針どおりの文体に統一する。
 */
function enforceBriefSummaries(
  summaries: string[],
  turningPoints: KishinTurningPoint[],
  facts: KifuEngineFacts,
  kifuText: string
): string[] {
  const padded = [...summaries];
  while (padded.length < 7) padded.push("");

  const result: string[] = [];

  result[0] = needsBriefSummaryRewrite(padded[0], 0)
    ? buildOpeningSummary(kifuText)
    : padded[0];

  for (let i = 0; i < 3; i++) {
    const tp = turningPoints[i];
    if (tp) {
      result[i + 1] = sentenceFromTurningPoint(tp, facts);
    } else if (needsBriefSummaryRewrite(padded[i + 1], i + 1)) {
      const moveNumber = extractMoveNumbers(padded[i + 1])[0];
      result[i + 1] =
        moveNumber != null
          ? formatActualVsCandidateSentence(
              moveNumber,
              facts,
              stripEvalOnlyPhrases(padded[i + 1])
            )
          : buildMidgameTransitionSummary(turningPoints, facts);
    } else {
      result[i + 1] = padded[i + 1];
    }
  }

  const tpMid = turningPoints[3];
  if (tpMid) {
    result[4] = sentenceFromTurningPoint(tpMid, facts);
  } else if (needsBriefSummaryRewrite(padded[4], 4)) {
    result[4] = buildMidgameTransitionSummary(turningPoints, facts);
  } else {
    result[4] = padded[4];
  }

  const tpEnd = turningPoints[4];
  if (tpEnd) {
    result[5] = sentenceFromTurningPoint(tpEnd, facts);
  } else if (needsBriefSummaryRewrite(padded[5], 5)) {
    result[5] = buildEndgameSummary(kifuText, facts);
  } else {
    result[5] = padded[5];
  }

  result[6] =
    padded[6].trim() && !isIncompleteBrief(padded[6]) && !PLACEHOLDER_RE.test(padded[6])
      ? padded[6]
      : padded[6].trim();

  return result;
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
  const insightNeedsRewrite =
    !insight ||
    PLACEHOLDER_RE.test(insight) ||
    /評価上優れ|候補手.*評価|方が評価/.test(insight) ||
    (isEvalHeavyBrief(insight) && lacksCandidateContrast(insight)) ||
    (hasCoordinateMoveNotation(insight) && lacksCandidateContrast(insight));

  if (insightNeedsRewrite) {
    insight = formatActualVsCandidateSentence(
      tp.moveNumber,
      facts,
      insight.replace(PLACEHOLDER_RE, "")
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
  const turningPoints = insight.turningPoints.map((tp) =>
    enrichTurningPoint(tp, facts)
  );

  return {
    ...insight,
    briefSummaries: enforceBriefSummaries(
      insight.briefSummaries,
      turningPoints,
      facts,
      kifuText
    ),
    turningPoints,
  };
}
