/** 読み筋・候補手を文章化（持ち駒の推測はしない。手番を明示する） */

const MOVE_TOKEN_RE = /[▲△][^▲△]*?(?=\s*[▲△]|$)/g;
const DEST_RE = /^([０-９0-9]?[一二三四五六七八九]|[１-９1-9][一二三四五六七八九])/;

function sideLabel(mark: "▲" | "△"): string {
  return mark === "▲" ? "先手が" : "後手が";
}

function markOf(token: string): "▲" | "△" {
  return token.startsWith("△") ? "△" : "▲";
}

function normalizePieceLabel(body: string): string {
  if (/と/.test(body)) return "と";
  if (/馬/.test(body) || /角成/.test(body)) return "馬";
  if (/竜|龍/.test(body) || /飛成/.test(body)) return "龍";
  if (/角/.test(body)) return "角";
  if (/飛/.test(body)) return "飛車";
  if (/金/.test(body)) return "金";
  if (/銀/.test(body)) return "銀";
  if (/桂/.test(body)) return "桂";
  if (/香/.test(body)) return "香";
  if (/歩/.test(body)) return "歩";
  if (/玉|王/.test(body)) return "玉";
  return "駒";
}

function parseDestination(body: string): string | null {
  const m = body.replace(/^同\s*/, "").match(DEST_RE);
  return m?.[1] ?? null;
}

/** 符号付き指し手を原文のまま抽出（(33) 等を保持） */
export function extractMoveTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const m of text.matchAll(MOVE_TOKEN_RE)) {
    const token = m[0].trim();
    if (token) tokens.push(token);
  }
  return tokens;
}

type MoveDescription = {
  text: string;
  dest: string | null;
};

/** 1手を手番付きで説明 */
export function describeMoveWithSide(
  token: string,
  prevDest: string | null
): MoveDescription {
  const mark = markOf(token);
  const side = sideLabel(mark);
  const body = token.replace(/^[▲△]/, "").trim();

  if (/打/.test(body)) {
    const dest = parseDestination(body.replace(/打.*/, "")) ?? "";
    const piece = normalizePieceLabel(body);
    const destPart = dest ? `${dest}に` : "";
    return {
      text: `${side}${destPart}${piece}を打つ（読み筋上）`,
      dest: dest || null,
    };
  }

  const fromMatch = body.match(/^(.+?)\((\d+)\)$/);
  if (fromMatch) {
    const main = fromMatch[1].trim();
    const from = fromMatch[2];
    const piece = normalizePieceLabel(main);

    if (/^同/.test(main)) {
      const ref = prevDest ? `${prevDest}のマスで` : "同じマスで";
      return {
        text: `${side}${from}の${piece}が${ref}取る`,
        dest: prevDest,
      };
    }

    const dest = parseDestination(main);
    if (dest) {
      return {
        text: `${side}${from}マスの${piece}を${dest}へ`,
        dest,
      };
    }
    return { text: `${side}${from}の${piece}を動かす`, dest: null };
  }

  const dest = parseDestination(body);
  const piece = normalizePieceLabel(body.replace(DEST_RE, ""));
  if (dest && piece) {
    return { text: `${side}${piece}を${dest}へ`, dest };
  }

  return { text: `${side}${body}`, dest: null };
}

/** @deprecated 手番なし。describeMoveWithSide を使うこと */
export function describeShogiMove(move: string): string {
  return describeMoveWithSide(move, null).text.replace(/^(先手が|後手が)/, "");
}

/** 候補手1手を強調した要約 */
export function summarizeCandidateMove(
  candidateMove: string,
  readingLine: string
): string {
  const tokens = extractMoveTokens(readingLine);
  const token =
    tokens.find((t) => t.replace(/\([^)]*\)/g, "") === candidateMove.replace(/\([^)]*\)/g, "")) ??
    tokens[0] ??
    candidateMove;

  return describeMoveWithSide(token, null).text;
}

/** 読み筋の続き（2手目以降）を手番付きで要約 */
export function summarizeReadingContinuation(
  readingLine: string,
  maxFollowMoves = 3
): string {
  const tokens = extractMoveTokens(readingLine);
  if (tokens.length <= 1) return "";

  const parts: string[] = [];
  let prevDest: string | null = describeMoveWithSide(tokens[0], null).dest;

  for (const token of tokens.slice(1, 1 + maxFollowMoves)) {
    const desc = describeMoveWithSide(token, prevDest);
    parts.push(desc.text);
    if (desc.dest) prevDest = desc.dest;
  }

  return parts.join("、");
}

/** 読み筋全体の要約（候補＋続き） */
export function summarizeReadingAsProse(
  readingLine: string,
  candidateMove = "",
  maxFollowMoves = 3
): string {
  const candidate = summarizeCandidateMove(candidateMove, readingLine);
  const continuation = summarizeReadingContinuation(readingLine, maxFollowMoves);

  if (continuation) {
    return `${candidate}。その後の読み筋では${continuation}。`;
  }
  return `${candidate}。`;
}

/** 保存済みAI文は読み筋がある場合は使わない（持ち駒創作などを防ぐ） */
export function shouldDiscardStoredIntent(
  aiText: string,
  readingLine: string,
  candidateMove: string
): boolean {
  if (!readingLine.trim() || !candidateMove.trim()) return false;
  const ai = aiText.trim();
  if (!ai) return false;
  if (/手に入れ|獲得|取った|持ち駒|新たに/.test(ai)) return true;
  return true;
}

/** @deprecated shouldDiscardStoredIntent を使用 */
export function aiIntentContradictsKifu(
  aiText: string,
  candidateMove: string,
  readingLine: string
): boolean {
  return shouldDiscardStoredIntent(aiText, readingLine, candidateMove);
}

/** 本譜・候補・読み筋から狙い文を機械生成 */
export function buildReadingBasedIntent(
  moveNumber: number,
  actualMove: string,
  candidateMove: string,
  readingLine: string
): string {
  const actual = describeMoveWithSide(actualMove, null).text;
  const candidate = summarizeCandidateMove(candidateMove, readingLine);
  const continuation = summarizeReadingContinuation(readingLine, 2);

  if (continuation) {
    return `${moveNumber}手目では${actual}と指したが、候補として${candidate}。その後の読み筋では${continuation}。`;
  }

  return `${moveNumber}手目では${actual}と指したが、候補として${candidate}。`;
}
