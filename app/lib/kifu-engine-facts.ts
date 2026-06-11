import { normalizeMoveToken } from "@/app/lib/kifu-move-index";
import { parseKifuWithEvals } from "@/app/lib/kifu-eval-parse";
import {
  extractMarkedMoves,
  parseEngineCommentLine,
  parseNumberedMoveLine,
} from "@/app/lib/kifu-line-parse";

export type KifuEngineFacts = {
  /** 手数 → 実戦の指し手 */
  moveByNumber: Map<number, string>;
  /** 手数 → その局面のエンジン候補手（候補1・読み筋から） */
  candidatesByNumber: Map<number, string[]>;
  /** 手数 → 読み筋テキスト（候補手の狙い推定用） */
  readingLineByNumber: Map<number, string>;
  /** 棋譜内に登場する全指し手（正規化済み） */
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

  let currentMoveNumber: number | null = null;
  let inEngineBlock = false;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseNumberedMoveLine(line);
    if (numbered) {
      currentMoveNumber = numbered.moveNumber;
      inEngineBlock = false;
      moveByNumber.set(numbered.moveNumber, numbered.move);
      registerMove(allMovesNormalized, numbered.move);
      for (const m of extractMarkedMoves(line)) {
        registerMove(allMovesNormalized, m);
      }
      continue;
    }

    if (/^\*\*\s*Engine/i.test(line)) {
      inEngineBlock = true;
      continue;
    }

    if (inEngineBlock && currentMoveNumber != null) {
      if (/^候補[１12]?/.test(line)) {
        for (const m of extractMarkedMoves(line)) {
          addCandidate(candidatesByNumber, currentMoveNumber, m);
          registerMove(allMovesNormalized, m);
        }
        continue;
      }

      if (/読み筋/.test(line)) {
        const body = line.replace(/^.*?読み筋\s*[：:]?\s*/, "").trim();
        if (body) {
          readingLineByNumber.set(currentMoveNumber, body);
        }
        for (const m of extractMarkedMoves(body || line)) {
          addCandidate(candidatesByNumber, currentMoveNumber, m);
          registerMove(allMovesNormalized, m);
        }
        continue;
      }

      if (/^評価値|^深さ|^ノード|^時間/.test(line)) continue;

      if (/^\d+\s/.test(line)) {
        inEngineBlock = false;
      }
    }

    for (const m of extractMarkedMoves(line)) {
      registerMove(allMovesNormalized, m);
    }

    if (currentMoveNumber != null && /読み筋/.test(line)) {
      const body = line.replace(/^.*?読み筋\s*[：:]?\s*/, "").trim();
      if (body) readingLineByNumber.set(currentMoveNumber, body);
    } else if (currentMoveNumber != null && /^[*＊#]/.test(line)) {
      const engine = parseEngineCommentLine(line);
      if (engine.candidate1Move) {
        addCandidate(
          candidatesByNumber,
          currentMoveNumber,
          engine.candidate1Move
        );
      }
    }
  }

  for (const parsed of parseKifuWithEvals(kifuText)) {
    if (!moveByNumber.has(parsed.moveNumber)) {
      moveByNumber.set(parsed.moveNumber, parsed.move);
    }
    registerMove(allMovesNormalized, parsed.move);
    if (parsed.candidate1Move) {
      addCandidate(candidatesByNumber, parsed.moveNumber, parsed.candidate1Move);
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
