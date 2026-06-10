import {
  isLikelyAttackMove,
  isLikelyDefensiveMove,
  isUserMove,
  parseKifuWithEvals,
  toUserEval,
  type ParsedKifuMove,
} from "@/app/lib/kifu-eval-parse";
import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import {
  midgameDataStatusMessage,
  resolveMidgameDataStatus,
  type MidgameDataStatus,
} from "@/app/lib/midgame-style-diagnostics";
import { resolvePlayerSideForRecord } from "@/app/lib/player-side-resolve";
import type { PlayerSide } from "@/app/lib/handicap";
import type { GameRecordDetail, KishinTurningPoint } from "@/app/lib/types";

/** 候補1より評価が低い選択とみなす差（cp） */
const EVAL_GAP_UNNECESSARY_DEFENSE = 50;
/** 評価急落（候補手なしの代替） */
const EVAL_DROP_SUBOPTIMAL = 40;
/** 1手での評価急落 */
const INITIATIVE_DROP = 70;
/** 相手攻め後に受けに回ったとみなす */
const PRESSURE_EVAL = -50;

export type MidgameStyleRecordMetrics = {
  recordId: string;
  analyzedUserMoves: number;
  unnecessaryDefense: number;
  initiativeLoss: number;
  forcedDefenseInferred: number;
  attackSequences: number;
  fromInsight?: boolean;
};

export type MidgameStyleAggregate = {
  gamesAnalyzed: number;
  analyzedUserMoves: number;
  unnecessaryDefense: number;
  unnecessaryDefenseRate: number;
  initiativeLoss: number;
  initiativeLossRate: number;
  forcedDefenseInferred: number;
  forcedDefenseRate: number;
  attackSequences: number;
  dataStatus: MidgameDataStatus;
  statusMessage: string;
  usedInsightFallback: boolean;
};

function evalBeforeUserMove(
  moves: ParsedKifuMove[],
  index: number,
  playerSide: PlayerSide
): number | null {
  for (let i = index - 1; i >= 0; i--) {
    const e = moves[i].evalAfter;
    if (e != null) return toUserEval(e, playerSide);
  }
  return null;
}

function movesDiffer(actual: string, candidate: string): boolean {
  return normalizeMoveToken(actual) !== normalizeMoveToken(candidate);
}

function isUnnecessaryDefense(
  m: ParsedKifuMove,
  evalBefore: number | null,
  evalAfter: number,
  candEval: number | null
): boolean {
  if (candEval != null && candEval - evalAfter >= EVAL_GAP_UNNECESSARY_DEFENSE) {
    return true;
  }

  if (
    m.candidate1Move &&
    movesDiffer(m.move, m.candidate1Move) &&
    evalBefore != null &&
    evalBefore - evalAfter >= EVAL_DROP_SUBOPTIMAL
  ) {
    return true;
  }

  if (
    evalBefore != null &&
    evalBefore - evalAfter >= EVAL_DROP_SUBOPTIMAL &&
    (isLikelyDefensiveMove(m.move) ||
      (m.candidate1Move && movesDiffer(m.move, m.candidate1Move)))
  ) {
    return true;
  }

  return false;
}

function analyzeFromKifuMoves(
  recordId: string,
  moves: ParsedKifuMove[],
  playerSide: PlayerSide
): MidgameStyleRecordMetrics {
  let unnecessaryDefense = 0;
  let initiativeLoss = 0;
  let forcedDefenseInferred = 0;
  let analyzedUserMoves = 0;
  let attackSequences = 0;
  let opponentAttackStreak = 0;

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const isOwnMove = isUserMove(m.side, playerSide);

    if (!isOwnMove) {
      if (isLikelyAttackMove(m.move)) opponentAttackStreak++;
      else opponentAttackStreak = 0;
      continue;
    }

    if (m.evalAfter == null) {
      opponentAttackStreak = 0;
      continue;
    }

    analyzedUserMoves++;
    const evalBefore = evalBeforeUserMove(moves, i, playerSide);
    const evalAfter = toUserEval(m.evalAfter, playerSide);
    const candEval =
      m.candidate1Eval != null
        ? toUserEval(m.candidate1Eval, playerSide)
        : null;

    if (isUnnecessaryDefense(m, evalBefore, evalAfter, candEval)) {
      unnecessaryDefense++;
    }

    if (
      evalBefore != null &&
      evalBefore - evalAfter >= INITIATIVE_DROP
    ) {
      initiativeLoss++;
    }

    const pressuredDefense =
      isLikelyDefensiveMove(m.move) &&
      (opponentAttackStreak >= 2 ||
        (opponentAttackStreak >= 1 &&
          evalBefore != null &&
          evalBefore <= PRESSURE_EVAL));
    if (pressuredDefense) {
      forcedDefenseInferred++;
    }

    if (isLikelyAttackMove(m.move)) attackSequences++;

    opponentAttackStreak = 0;
  }

  return {
    recordId,
    analyzedUserMoves,
    unnecessaryDefense,
    initiativeLoss,
    forcedDefenseInferred,
    attackSequences,
  };
}

function analyzeFromKishinInsight(
  recordId: string,
  turningPoints: KishinTurningPoint[]
): MidgameStyleRecordMetrics | null {
  if (turningPoints.length === 0) return null;

  let unnecessaryDefense = 0;
  let initiativeLoss = 0;
  let forcedDefenseInferred = 0;

  for (const tp of turningPoints) {
    const hasCandidate =
      tp.topCandidate.trim() &&
      movesDiffer(tp.move, tp.topCandidate);

    if (hasCandidate) unnecessaryDefense++;

    if (/急落|不利|失点|評価.*下|悪化|ミス/.test(tp.evalChange + tp.insight)) {
      initiativeLoss++;
    } else if (hasCandidate) {
      initiativeLoss++;
    }

    if (
      /受け|守|退|引|戻|防|凌|被/.test(tp.insight) ||
      isLikelyDefensiveMove(tp.move)
    ) {
      forcedDefenseInferred++;
    }
  }

  return {
    recordId,
    analyzedUserMoves: turningPoints.length,
    unnecessaryDefense,
    initiativeLoss,
    forcedDefenseInferred,
    attackSequences: 0,
    fromInsight: true,
  };
}

export function analyzeMidgameStyleForRecord(
  record: GameRecordDetail
): MidgameStyleRecordMetrics | null {
  const kifu = record.kifuText?.trim();
  const playerSide = resolvePlayerSideForRecord(record);
  if (!kifu || !playerSide) return null;

  const moves = parseKifuWithEvals(kifu);
  if (moves.length === 0) return null;

  const fromKifu = analyzeFromKifuMoves(record.id, moves, playerSide);
  if (fromKifu.analyzedUserMoves > 0) return fromKifu;

  const fromInsight = analyzeFromKishinInsight(
    record.id,
    record.kishinInsight?.turningPoints ?? []
  );
  if (fromInsight) return fromInsight;

  return fromKifu;
}

export function aggregateMidgameStyleMetrics(
  records: GameRecordDetail[]
): MidgameStyleAggregate | null {
  const kifuRecords = records.filter((r) => r.kifuText?.trim());
  if (kifuRecords.length === 0) return null;

  const perRecord = kifuRecords
    .map(analyzeMidgameStyleForRecord)
    .filter((m): m is MidgameStyleRecordMetrics => m != null);

  if (perRecord.length === 0) return null;

  const totals = perRecord.reduce(
    (acc, r) => ({
      analyzedUserMoves: acc.analyzedUserMoves + r.analyzedUserMoves,
      unnecessaryDefense: acc.unnecessaryDefense + r.unnecessaryDefense,
      initiativeLoss: acc.initiativeLoss + r.initiativeLoss,
      forcedDefenseInferred:
        acc.forcedDefenseInferred + r.forcedDefenseInferred,
      attackSequences: acc.attackSequences + r.attackSequences,
    }),
    {
      analyzedUserMoves: 0,
      unnecessaryDefense: 0,
      initiativeLoss: 0,
      forcedDefenseInferred: 0,
      attackSequences: 0,
    }
  );

  const usedInsightFallback = perRecord.some((r) => r.fromInsight);
  const denom = totals.analyzedUserMoves || 1;

  const metricTotal =
    totals.unnecessaryDefense +
    totals.initiativeLoss +
    totals.forcedDefenseInferred;

  let dataStatus = resolveMidgameDataStatus(
    kifuRecords,
    totals.analyzedUserMoves,
    perRecord.length,
    kifuRecords.length,
    usedInsightFallback
  );

  if (
    dataStatus === "ok" &&
    totals.analyzedUserMoves > 0 &&
    metricTotal === 0
  ) {
    dataStatus = "no_matching_issues";
  }

  return {
    gamesAnalyzed: perRecord.length,
    analyzedUserMoves: totals.analyzedUserMoves,
    unnecessaryDefense: totals.unnecessaryDefense,
    unnecessaryDefenseRate: Math.round(
      (totals.unnecessaryDefense / denom) * 100
    ),
    initiativeLoss: totals.initiativeLoss,
    initiativeLossRate: Math.round((totals.initiativeLoss / denom) * 100),
    forcedDefenseInferred: totals.forcedDefenseInferred,
    forcedDefenseRate: Math.round(
      (totals.forcedDefenseInferred / denom) * 100
    ),
    attackSequences: totals.attackSequences,
    dataStatus,
    statusMessage: midgameDataStatusMessage(dataStatus),
    usedInsightFallback,
  };
}
