import {
  isLikelyAttackMove,
  isUserMove,
  parseKifuWithEvals,
  toUserEval,
  type ParsedKifuMove,
} from "@/app/lib/kifu-eval-parse";
import { resolvePlayerSideForRecord } from "@/app/lib/player-side-resolve";
import type { PlayerSide } from "@/app/lib/handicap";
import type { GameRecordDetail } from "@/app/lib/types";

/** 候補1より評価が低い選択とみなす差（cp） */
const EVAL_GAP_UNNECESSARY_DEFENSE = 50;
/** 自分有利とみなす評価 */
const FAVORABLE_THRESHOLD = 80;
/** 1手での評価急落 */
const INITIATIVE_DROP = 70;
const ATTACK_SEQUENCE_MIN = 2;

export type MidgameStyleRecordMetrics = {
  recordId: string;
  analyzedUserMoves: number;
  unnecessaryDefense: number;
  initiativeLoss: number;
  forcedDefenseInferred: number;
  attackSequences: number;
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

export function analyzeMidgameStyleForRecord(
  record: GameRecordDetail
): MidgameStyleRecordMetrics | null {
  const kifu = record.kifuText?.trim();
  const playerSide = resolvePlayerSideForRecord(record);
  if (!kifu || !playerSide) return null;

  const moves = parseKifuWithEvals(kifu);
  if (moves.length === 0) return null;

  let unnecessaryDefense = 0;
  let initiativeLoss = 0;
  let forcedDefenseInferred = 0;
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
      endEval >= FAVORABLE_THRESHOLD / 2 &&
      endEval >= (streakStartEval ?? 0) - 40
    ) {
      forcedDefenseInferred++;
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
    const candEval =
      m.candidate1Eval != null
        ? toUserEval(m.candidate1Eval, playerSide)
        : null;

    if (
      candEval != null &&
      candEval - evalAfter >= EVAL_GAP_UNNECESSARY_DEFENSE
    ) {
      unnecessaryDefense++;
    }

    if (
      evalBefore != null &&
      evalBefore >= FAVORABLE_THRESHOLD &&
      evalAfter <= evalBefore - INITIATIVE_DROP
    ) {
      initiativeLoss++;
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
    recordId: record.id,
    analyzedUserMoves,
    unnecessaryDefense,
    initiativeLoss,
    forcedDefenseInferred,
    attackSequences,
  };
}

export function aggregateMidgameStyleMetrics(
  records: GameRecordDetail[]
): MidgameStyleAggregate | null {
  const perRecord = records
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

  const denom = totals.analyzedUserMoves || 1;
  const attackDenom = totals.attackSequences || 1;

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
    forcedDefenseRate:
      totals.attackSequences > 0
        ? Math.round(
            (totals.forcedDefenseInferred / attackDenom) * 100
          )
        : 0,
    attackSequences: totals.attackSequences,
  };
}
