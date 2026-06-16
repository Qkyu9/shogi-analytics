import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import {
  applyPendingToMaps,
  createPreMoveAnalysisState,
  hasPendingContent,
  processPreMoveLine,
  resetPreMoveState,
} from "@/app/lib/kifu-pending-analysis";
import {
  extractMarkedMoves,
  extractMoveDestination,
  parseEngineEvalLine,
  parseNumberedMoveLine,
} from "@/app/lib/kifu-line-parse";

export type KifuEngineFacts = {
  moveByNumber: Map<number, string>;
  candidatesByNumber: Map<number, string[]>;
  readingLineByNumber: Map<number, string>;
  allMovesNormalized: Set<string>;
  /** 変化図の情報（変化：N手目 ブロックから抽出） */
  variationsByNumber: Map<number, { firstMove: string; evalAfter?: number }>;
};

function addCandidate(
  map: Map<number, string[]>,
  moveNumber: number,
  move: string
) {
  const list = map.get(moveNumber) ?? [];
  const norm = normalizeMoveToken(move);
  if (list.some((m) => normalizeMoveToken(m) === norm)) return;
  list.push(move);
  map.set(moveNumber, list);
}

function registerMove(set: Set<string>, move: string) {
  set.add(normalizeMoveToken(move));
}

/** 棋譜から実戦手・局面ごとのエンジン候補手を抽出 */
export function parseKifuEngineFacts(kifuText: string): KifuEngineFacts {
  const moveByNumber = new Map<number, string>();
  const candidatesByNumber = new Map<number, string[]>();
  const readingLineByNumber = new Map<number, string>();
  const allMovesNormalized = new Set<string>();
  const variationsByNumber = new Map<number, { firstMove: string; evalAfter?: number }>();

  let preMove = createPreMoveAnalysisState();
  let prevDest: string | null = null; // 直前の実戦手の着地座標（「同」解決用）

  // 変化図処理用フラグ
  let inVariation = false;
  let variationPending: { moveNumber: number; firstMove?: string; evalAfter?: number } | null = null;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // 変化図開始マーカーの検出
    const variationMatch = line.match(/^変化：(\d+)手目/);
    if (variationMatch) {
      // 直前の変化図ペンディングを確定
      if (variationPending?.firstMove) {
        variationsByNumber.set(variationPending.moveNumber, {
          firstMove: variationPending.firstMove,
          evalAfter: variationPending.evalAfter,
        });
      }
      inVariation = true;
      variationPending = { moveNumber: parseInt(variationMatch[1], 10) };
      continue;
    }

    // 変化図内の処理（インデントで始まる行）
    if (inVariation) {
      if (/^[\s　\t]/.test(rawLine)) {
        // 変化図の行（全角スペース・半角スペース・タブでインデントされた行）
        const varLine = line; // trim済み
        if (variationPending && !variationPending.firstMove) {
          // 最初の手番行を探す
          const numbered = parseNumberedMoveLine(varLine);
          if (numbered && numbered.moveNumber === variationPending.moveNumber) {
            variationPending.firstMove = numbered.move;
            registerMove(allMovesNormalized, numbered.move);
          }
        } else if (variationPending?.firstMove) {
          // firstMove 確定後の評価値行を取得
          const evalVal = parseEngineEvalLine(varLine);
          if (evalVal != null && variationPending.evalAfter === undefined) {
            variationPending.evalAfter = evalVal;
          }
        }
        continue; // 変化図の行は実戦処理をスキップ
      } else {
        // インデントなし行が来た → 変化図終了
        if (variationPending?.firstMove) {
          variationsByNumber.set(variationPending.moveNumber, {
            firstMove: variationPending.firstMove,
            evalAfter: variationPending.evalAfter,
          });
        }
        inVariation = false;
        variationPending = null;
        // この行は実戦として続けて処理する（fall through）
      }
    }

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      if (preMove.active || hasPendingContent(preMove.pending)) {
        applyPendingToMaps(
          numbered.moveNumber,
          numbered.side,
          numbered.move,
          preMove.pending,
          (n, m) => addCandidate(candidatesByNumber, n, m),
          (n, r) => readingLineByNumber.set(n, r),
          prevDest
        );
      }
      preMove = resetPreMoveState();

      moveByNumber.set(numbered.moveNumber, numbered.move);
      registerMove(allMovesNormalized, numbered.move);
      for (const m of extractMarkedMoves(line)) {
        registerMove(allMovesNormalized, m);
      }

      // 「同」系は着地点が前と同じのため prevDest は更新しない
      const dest = extractMoveDestination(numbered.move);
      if (dest) prevDest = dest;

      continue;
    }

    processPreMoveLine(preMove, line);
    for (const m of extractMarkedMoves(line)) {
      registerMove(allMovesNormalized, m);
    }
  }

  // ループ終了後も未確定の変化図ペンディングがあれば確定
  if (variationPending?.firstMove) {
    variationsByNumber.set(variationPending.moveNumber, {
      firstMove: variationPending.firstMove,
      evalAfter: variationPending.evalAfter,
    });
  }

  return {
    moveByNumber,
    candidatesByNumber,
    readingLineByNumber,
    allMovesNormalized,
    variationsByNumber,
  };
}

export function formatKifuCandidateFactBlock(kifuText: string): string {
  const facts = parseKifuEngineFacts(kifuText);
  const lines: string[] = [];

  for (const [n, move] of [...facts.moveByNumber.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const cands = facts.candidatesByNumber.get(n) ?? [];
    const reading = facts.readingLineByNumber.get(n);
    if (cands.length === 0) {
      lines.push(`${n}手 実戦:${move} / 候補:（棋譜に候補1・読み筋なし）`);
    } else {
      const readingPart = reading ? ` / 読み筋:${reading}` : "";
      lines.push(`${n}手 実戦:${move} / 候補:${cands.join("、")}${readingPart}`);
    }
  }

  if (lines.length === 0) {
    return "（候補手一覧を棋譜から抽出できませんでした）";
  }

  return lines.join("\n");
}

export function moveExistsInKifu(
  facts: KifuEngineFacts,
  move: string
): boolean {
  return facts.allMovesNormalized.has(normalizeMoveToken(move));
}

export function isCandidateForMove(
  facts: KifuEngineFacts,
  moveNumber: number,
  move: string
): boolean {
  const cands = facts.candidatesByNumber.get(moveNumber) ?? [];
  const norm = normalizeMoveToken(move);
  return cands.some((c) => normalizeMoveToken(c) === norm);
}

export function isActualMoveAt(
  facts: KifuEngineFacts,
  moveNumber: number,
  move: string
): boolean {
  const actual = facts.moveByNumber.get(moveNumber);
  if (!actual) return false;
  return normalizeMoveToken(actual) === normalizeMoveToken(move);
}
