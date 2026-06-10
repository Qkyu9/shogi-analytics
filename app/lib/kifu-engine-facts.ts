import { normalizeMoveToken } from "@/app/lib/kifu-move-index";

export type KifuEngineFacts = {
  /** 手数 → 実戦の指し手 */
  moveByNumber: Map<number, string>;
  /** 手数 → その局面のエンジン候補手（候補1・読み筋から） */
  candidatesByNumber: Map<number, string[]>;
  /** 棋譜内に登場する全指し手（正規化済み） */
  allMovesNormalized: Set<string>;
};

const MOVE_TOKEN_RE = /([▲△][^▲△\s、。，]+(?:\([^)]*\))?)/g;

/** テキストから符号付き指し手を抽出 */
export function extractMarkedMoves(text: string): string[] {
  const moves: string[] = [];
  for (const m of text.matchAll(MOVE_TOKEN_RE)) {
    const move = m[1].replace(/\([^)]*\)/g, "").trim();
    if (move) moves.push(move);
  }
  return moves;
}

function parseMoveNumberLine(
  line: string
): { moveNumber: number; move: string } | null {
  const withMark = line.match(
    /^(\d+)\s*[.．]?\s*([▲△])\s*(\S+?)(?:\([^)]*\))?/
  );
  if (withMark) {
    return {
      moveNumber: Number(withMark[1]),
      move: `${withMark[2]}${withMark[3].replace(/^[▲△]/, "")}`,
    };
  }

  const kifStyle = line.match(/^(\d+)\s*[.．]?\s*(\S+?)(?:\([^)]*\))?/);
  if (!kifStyle) return null;
  const body = kifStyle[2].replace(/^[▲△]/, "");
  if (!body || /^候補|^\*\*/.test(body)) return null;

  const moveNumber = Number(kifStyle[1]);
  const side = moveNumber % 2 === 1 ? "▲" : "△";
  return { moveNumber, move: `${side}${body}` };
}

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
  const allMovesNormalized = new Set<string>();

  let currentMoveNumber: number | null = null;
  let inEngineBlock = false;

  for (const rawLine of kifuText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbered = parseMoveNumberLine(line);
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
        const body = line.replace(/^.*?読み筋\s*/, "");
        for (const m of extractMarkedMoves(body)) {
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
  }

  return { moveByNumber, candidatesByNumber, allMovesNormalized };
}

export function formatKifuCandidateFactBlock(kifuText: string): string {
  const facts = parseKifuEngineFacts(kifuText);
  const lines: string[] = [];

  for (const [n, move] of [...facts.moveByNumber.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const cands = facts.candidatesByNumber.get(n) ?? [];
    if (cands.length === 0) {
      lines.push(`${n}手 実戦:${move} / 候補:（棋譜に候補1・読み筋なし）`);
    } else {
      lines.push(`${n}手 実戦:${move} / 候補:${cands.join("、")}`);
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
