import type { GameRecordDetail, GameRecordDraft } from "./types";

export function detailToDraft(record: GameRecordDetail): GameRecordDraft {
  return {
    playedAt: record.playedAt,
    venueType: record.venueType,
    result: record.result,
    myStrategy: record.myStrategy,
    opponentStrategy: record.opponentStrategy,
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
    sourceInputText: record.sourceInputText,
  };
}
