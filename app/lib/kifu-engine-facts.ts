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
  parseNumberedMoveLine,
} from "@/app/lib/kifu-line-parse";

export type KifuEngineFacts = {
  moveByNumber: Map<number, string>;
  candidatesByNumber: Map<number, string[]>;
  readingLineByNumber: Map<number, string>;
  allMovesNormalized: Set<string>;
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

  let preMove = createPreMoveAnalysisState();

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      if (preMove.active || hasPendingContent(preMove.pending)) {
        applyPendingToMaps(
          numbered.moveNumber,
          numbered.side,
          numbered.move,
          preMove.pending,
          (n, m) => addCandidate(candidatesByNumber, n, m),
          (n, r) => readingLineByNumber.set(n, r)
        );
      }
      preMove = resetPreMoveState();

      moveByNumber.set(numbered.moveNumber, numbered.move);
      registerMove(allMovesNormalized, numbered.move);
      for (const m of extractMarkedMoves(line)) {
        registerMove(allMovesNormalized, m);
      }
      continue;
    }

    processPreMoveLine(preMove, line);
    for (const m of extractMarkedMoves(line)) {
      registerMove(allMovesNormalized, m);
    }
  }

  return {
    moveByNumber,
    candidatesByNumber,
    readingLineByNumber,
    allMovesNormalized,
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
