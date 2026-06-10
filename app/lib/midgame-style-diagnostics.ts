import { isUserMove, parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import { resolvePlayerSideForRecord } from "@/app/lib/player-side-resolve";
import type { GameRecordDetail } from "@/app/lib/types";

export type MidgameDataStatus =
  | "ok"
  | "no_kifu"
  | "missing_player_side"
  | "no_parsed_moves"
  | "missing_evaluations"
  | "no_user_moves"
  | "no_matching_issues"
  | "insight_fallback";

export type MidgameKifuDiagnostics = {
  totalMoves: number;
  movesWithEval: number;
  userMoves: number;
  userMovesWithEval: number;
  hasEngineMarkers: boolean;
  insightTurningPoints: number;
};

export function inspectKifuForAnalysis(
  kifu: string,
  playerSide: ReturnType<typeof resolvePlayerSideForRecord>
): MidgameKifuDiagnostics {
  const moves = parseKifuWithEvals(kifu);
  const movesWithEval = moves.filter((m) => m.evalAfter != null).length;
  const userMoves = playerSide
    ? moves.filter((m) => isUserMove(m.side, playerSide)).length
    : 0;
  const userMovesWithEval = playerSide
    ? moves.filter(
        (m) => isUserMove(m.side, playerSide) && m.evalAfter != null
      ).length
    : 0;

  const hasEngineMarkers =
    /Engine|解析|評価値|読み筋|\*\*\s*[+\-]?\d|^\s*[#*＊].*評価/m.test(kifu);

  return {
    totalMoves: moves.length,
    movesWithEval,
    userMoves,
    userMovesWithEval,
    hasEngineMarkers,
    insightTurningPoints: 0,
  };
}

export function resolveMidgameDataStatus(
  records: GameRecordDetail[],
  analyzedUserMoves: number,
  gamesAnalyzed: number,
  kifuRecordCount: number,
  usedInsightFallback: boolean
): MidgameDataStatus {
  if (kifuRecordCount === 0) return "no_kifu";
  if (usedInsightFallback) return "insight_fallback";
  if (gamesAnalyzed === 0) {
    const anySide = records.some(
      (r) => r.kifuText?.trim() && !resolvePlayerSideForRecord(r)
    );
    return anySide ? "missing_player_side" : "no_parsed_moves";
  }
  if (analyzedUserMoves === 0) {
    const diag = records
      .filter((r) => r.kifuText?.trim())
      .map((r) =>
        inspectKifuForAnalysis(
          r.kifuText!.trim(),
          resolvePlayerSideForRecord(r)
        )
      );
    if (diag.every((d) => d.totalMoves === 0)) return "no_parsed_moves";
    if (diag.every((d) => d.movesWithEval === 0)) return "missing_evaluations";
    if (diag.every((d) => d.userMovesWithEval === 0)) return "no_user_moves";
    return "no_user_moves";
  }
  return "ok";
}

export function midgameDataStatusMessage(status: MidgameDataStatus): string {
  switch (status) {
    case "no_kifu":
      return "棋譜が記録された対局がありません。";
    case "missing_player_side":
      return "先手/後手が未記録の対局があり、自分の手を特定できません。各対局の手合を確認してください。";
    case "no_parsed_moves":
      return "棋譜から手を読み取れませんでした。棋神アナリティクスからコピーしたテキストをそのまま貼り付けてください。";
    case "missing_evaluations":
      return "棋譜に評価値が含まれていません。棋神アナリティクスで「棋譜解析」を実行してから、解析結果付きの棋譜をコピーしてください。";
    case "no_user_moves":
      return "自分の手に評価値が紐づいていません。手番（先手/後手）と棋譜の▲△が一致しているか確認してください。";
    case "no_matching_issues":
      return "集計対象の手はありますが、今回の条件に該当する手は見つかりませんでした。";
    case "insight_fallback":
      return "棋譜から評価値を十分に読み取れなかったため、棋神示唆の要所データで代用しています。";
    default:
      return "";
  }
}
