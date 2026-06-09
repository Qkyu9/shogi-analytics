import type { GameRecordDetail, GameRecordDraft } from "./types";

export function detailToDraft(record: GameRecordDetail): GameRecordDraft {
  return {
    playedAt: record.playedAt,
    venueType: record.venueType,
    handicap: record.handicap ?? "",
    playerSide: record.playerSide ?? null,
    result: record.result,
    myStrategy: record.myStrategy,
    opponentStrategy: record.opponentStrategy,
    opponentRank: record.opponentRank ?? "",
    positions: record.positions.map(
      ({ sceneDescription, defeatCause, correctMove, lesson }) => ({
        sceneDescription,
        defeatCause,
        correctMove,
        lesson,
      })
    ),
    tags: record.tags,
    kifuText: record.kifuText,
    kishinInsight: record.kishinInsight,
    sourceInputText: record.sourceInputText,
  };
}
