import {
  isLikelyAttackMove,
  isUserMove,
  parseKifuWithEvals,
  toUserEval,
  type ParsedKifuMove,
} from "@/app/lib/kifu-eval-parse";
import {
  midgameDataStatusMessage,
  resolveMidgameDataStatus,
  type MidgameDataStatus,
} from "@/app/lib/midgame-style-diagnostics";
import { resolvePlayerSideForRecord } from "@/app/lib/player-side-resolve";
import type { PlayerSide } from "@/app/lib/handicap";
import type { GameRecordDetail, KishinTurningPoint } from "@/app/lib/types";

/** 自分優勢とみなす評価（cp・自分目線） */
const ADVANTAGE_THRESHOLD = 80;
/** 自分劣勢とみなす評価 */
const DISADVANTAGE_THRESHOLD = -40;
/** 互角以下（優勢から落ちた先） */
const EVEN_OR_WORSE_THRESHOLD = 0;
const ATTACK_SEQUENCE_MIN = 2;

export type MidgameStyleRecordMetrics = {
  recordId: string;
  analyzedUserMoves: number;
  /** 受けを強要する好手 */
  forcingAttackGood: number;
  /** 劣勢での悪手 */
  badMoveInDisadvantage: number;
  /** 優勢での悪手 */
  badMoveInAdvantage: number;
  attackSequences: number;
  fromInsight?: boolean;
};

export type MidgameStyleAggregate = {
  gamesAnalyzed: number;
  analyzedUserMoves: number;
  forcingAttackGood: number;
  forcingAttackGoodRate: number;
  badMoveInDisadvantage: number;
  badMoveInDisadvantageRate: number;
  badMoveInAdvantage: number;
  badMoveInAdvantageRate: number;
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

function isBadMoveInDisadvantage(
  evalBefore: number | null,
  evalAfter: number
): boolean {
  return (
    evalBefore != null &&
    evalBefore <= DISADVANTAGE_THRESHOLD &&
    evalAfter < evalBefore
  );
}

function isBadMoveInAdvantage(
  evalBefore: number | null,
  evalAfter: number
): boolean {
  return (
    evalBefore != null &&
    evalBefore >= ADVANTAGE_THRESHOLD &&
    evalAfter <= EVEN_OR_WORSE_THRESHOLD
  );
}

function analyzeFromKifuMoves(
  recordId: string,
  moves: ParsedKifuMove[],
  playerSide: PlayerSide
): MidgameStyleRecordMetrics {
  let forcingAttackGood = 0;
  let badMoveInDisadvantage = 0;
  let badMoveInAdvantage = 0;
  let analyzedUserMoves = 0;
  let attackSequences = 0;

  let attackStreak = 0;
  let streakStartEval: number | null = null;
  let streakEndEval: number | null = null;

  const closeAttackSequence = () => {
    if (attackStreak < ATTACK_SEQUENCE_MIN) {
      attackStreak = 0;
      streakStartEval = null;
      streakEndEval = null;
      return;
    }
    attackSequences++;
    const endEval = streakEndEval ?? streakStartEval;
    if (
      endEval != null &&
      endEval >= ADVANTAGE_THRESHOLD / 2 &&
      endEval >= (streakStartEval ?? 0) - 30
    ) {
      forcingAttackGood++;
    }
    attackStreak = 0;
    streakStartEval = null;
    streakEndEval = null;
  };

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!isUserMove(m.side, playerSide)) continue;
    if (m.evalAfter == null) continue;

    analyzedUserMoves++;
    const evalBefore = evalBeforeUserMove(moves, i, playerSide);
    const evalAfter = toUserEval(m.evalAfter, playerSide);

    if (isBadMoveInDisadvantage(evalBefore, evalAfter)) {
      badMoveInDisadvantage++;
    }

    if (isBadMoveInAdvantage(evalBefore, evalAfter)) {
      badMoveInAdvantage++;
    }

    if (isLikelyAttackMove(m.move)) {
      if (attackStreak === 0) streakStartEval = evalBefore;
      attackStreak++;
      streakEndEval = evalAfter;
    } else {
      closeAttackSequence();
    }
  }

  closeAttackSequence();

  return {
    recordId,
    analyzedUserMoves,
    forcingAttackGood,
    badMoveInDisadvantage,
    badMoveInAdvantage,
    attackSequences,
  };
}

function analyzeFromKishinInsight(
  recordId: string,
  turningPoints: KishinTurningPoint[]
): MidgameStyleRecordMetrics | null {
  if (turningPoints.length === 0) return null;

  let forcingAttackGood = 0;
  let badMoveInDisadvantage = 0;
  let badMoveInAdvantage = 0;

  for (const tp of turningPoints) {
    const text = `${tp.evalChange}${tp.insight}`;

    if (
      isLikelyAttackMove(tp.move) &&
      !/悪|ミス|不利|急落/.test(text)
    ) {
      forcingAttackGood++;
    }

    if (/劣勢|不利/.test(text) && /悪|ミス|急落|失点/.test(text)) {
      badMoveInDisadvantage++;
    }

    if (/優勢|有利/.test(text) && /悪|ミス|急落|互角|失点/.test(text)) {
      badMoveInAdvantage++;
    }
  }

  return {
    recordId,
    analyzedUserMoves: turningPoints.length,
    forcingAttackGood,
    badMoveInDisadvantage,
    badMoveInAdvantage,
    attackSequences: forcingAttackGood,
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
      forcingAttackGood: acc.forcingAttackGood + r.forcingAttackGood,
      badMoveInDisadvantage:
        acc.badMoveInDisadvantage + r.badMoveInDisadvantage,
      badMoveInAdvantage: acc.badMoveInAdvantage + r.badMoveInAdvantage,
      attackSequences: acc.attackSequences + r.attackSequences,
    }),
    {
      analyzedUserMoves: 0,
      forcingAttackGood: 0,
      badMoveInDisadvantage: 0,
      badMoveInAdvantage: 0,
      attackSequences: 0,
    }
  );

  const usedInsightFallback = perRecord.some((r) => r.fromInsight);
  const moveDenom = totals.analyzedUserMoves || 1;
  const attackDenom = totals.attackSequences || 1;

  const metricTotal =
    totals.forcingAttackGood +
    totals.badMoveInDisadvantage +
    totals.badMoveInAdvantage;

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
    forcingAttackGood: totals.forcingAttackGood,
    forcingAttackGoodRate:
      totals.attackSequences > 0
        ? Math.round((totals.forcingAttackGood / attackDenom) * 100)
        : 0,
    badMoveInDisadvantage: totals.badMoveInDisadvantage,
    badMoveInDisadvantageRate: Math.round(
      (totals.badMoveInDisadvantage / moveDenom) * 100
    ),
    badMoveInAdvantage: totals.badMoveInAdvantage,
    badMoveInAdvantageRate: Math.round(
      (totals.badMoveInAdvantage / moveDenom) * 100
    ),
    attackSequences: totals.attackSequences,
    dataStatus,
    statusMessage: midgameDataStatusMessage(dataStatus),
    usedInsightFallback,
  };
}
