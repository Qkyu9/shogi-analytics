/** 候補手・読み筋からコンパクトな「狙い」文を生成 */

const MOVE_TOKEN_RE = /[▲△][^▲△]*?(?=\s*[▲△]|$)/g;
const DEST_RE = /^([０-９0-9]?[一二三四五六七八九]|[１-９1-9][一二三四五六七八九])/;

function markOf(token: string): "▲" | "△" {
  return token.startsWith("△") ? "△" : "▲";
}

function compactPiece(body: string): string {
  if (/と/.test(body)) return "と";
  if (/馬/.test(body) || /角成/.test(body)) return "馬";
  if (/竜|龍/.test(body) || /飛成/.test(body)) return "龍";
  if (/角/.test(body)) return "角";
  if (/飛/.test(body)) return "飛";
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

/** 符号付き指し手を原文のまま抽出 */
export function extractMoveTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const m of text.matchAll(MOVE_TOKEN_RE)) {
    const token = m[0].trim();
    if (token) tokens.push(token);
  }
  return tokens;
}

/** △５一角(33) → △５一角、△同 飛(81) + prev=８二 → △８二同飛 */
export function compactMoveLabel(
  token: string,
  prevDest: string | null
): { label: string; dest: string | null } {
  const mark = markOf(token);
  const rawBody = token.replace(/^[▲△]/, "").trim();

  if (/打/.test(rawBody)) {
    const dest = parseDestination(rawBody.replace(/打.*/, "")) ?? "";
    const piece = compactPiece(rawBody);
    return { label: `${mark}${dest}${piece}打`, dest: dest || null };
  }

  const body = rawBody.replace(/\(\d+\)$/, "");

  if (/^同/.test(body)) {
    const piece = compactPiece(body.replace(/^同\s*/, ""));
    const dest = prevDest ?? "";
    return { label: `${mark}${dest}同${piece}`, dest: prevDest };
  }

  const dest = parseDestination(body);
  const piece = compactPiece(body.replace(DEST_RE, ""));
  if (dest && piece) {
    return { label: `${mark}${dest}${piece}`, dest };
  }

  return { label: `${mark}${body}`, dest: null };
}

function normalizeTokenKey(token: string): string {
  return token.replace(/\([^)]*\)/g, "").replace(/\s+/g, "");
}

function resolveCandidateToken(
  candidateMove: string,
  readingLine: string
): string {
  const tokens = extractMoveTokens(readingLine);
  const key = normalizeTokenKey(candidateMove);
  const matched = tokens.find((t) => normalizeTokenKey(t) === key);
  if (matched) return matched;

  if (/^[▲△]/.test(candidateMove)) return candidateMove;
  return candidateMove;
}

/** 読み筋から展開の狙いを短く推定（多少の推測を許容） */
export function inferStrategySuffix(
  tokens: string[],
  storedInsight?: string
): string {
  const ai = storedInsight?.trim() ?? "";
  if (ai && !/手に入れ|持ち駒を制|持ち駒に/.test(ai)) {
    const cleaned = ai
      .replace(/\d+手目(?:では|、)?/g, "")
      .replace(/本譜|実戦|選んだ|指した/g, "")
      .replace(/^[、。\s]+|[、。\s]+$/g, "");

    const afterBut = cleaned.match(
      /(?:が|けど|が、)(.+?(?:展開|流れ|手筋|狙い|圧|攻|守).+?)(?:。|$)/
    );
    if (afterBut?.[1] && afterBut[1].length >= 4 && afterBut[1].length <= 48) {
      return afterBut[1].replace(/。$/, "");
    }

    if (cleaned.length >= 6 && cleaned.length <= 48 && !/[▲△]/.test(cleaned)) {
      return cleaned.replace(/。$/, "");
    }
  }

  const joined = tokens.map((t) => t.replace(/^[▲△]/, "")).join("");
  const first = tokens[0] ?? "";

  if (/角|馬/.test(first)) {
    if (/飛|竜|龍/.test(joined)) return "角と飛車の連携で攻めを続けられる";
    if (/同/.test(joined)) return "角を活かして同マスでの取り合いに持ち込める";
    return "角の働きを広げて相手に圧力をかけられる";
  }
  if (/飛|竜|龍/.test(first)) return "飛車を利かせた展開を作れる";
  if (/金|銀/.test(first)) return "守りの駒を整えて形を保てる";
  if (/玉|王/.test(first)) return "玉の安全を確保しやすい";
  if (/歩/.test(first) && /打/.test(first)) return "歩の突き出しで攻めの隙を作れる";
  return "形勢を維持しやすい進行";
}

/**
 * 狙い文（コンパクト）
 * 例: △５一角と指せば、以下▲８二馬、△８二同飛で角と飛車の連携で攻めを続けられる。
 */
export function buildCompactAim(
  candidateMove: string,
  readingLine: string,
  storedInsight?: string,
  maxFollowMoves = 2
): string {
  const tokens = extractMoveTokens(readingLine);
  const candToken = resolveCandidateToken(candidateMove, readingLine);
  const candMark = /^[▲△]/.test(candToken)
    ? candToken
    : `${candidateMove.startsWith("△") ? "△" : "▲"}${candToken.replace(/^[▲△]/, "")}`;

  const { label: candLabel, dest: firstDest } = compactMoveLabel(candMark, null);

  const followLabels: string[] = [];
  let prevDest = firstDest;

  for (const token of tokens.slice(1, 1 + maxFollowMoves)) {
    const { label, dest } = compactMoveLabel(token, prevDest);
    followLabels.push(label);
    if (dest) prevDest = dest;
  }

  const strategy = inferStrategySuffix(
    tokens.length > 0 ? tokens : [candMark],
    storedInsight
  );

  if (followLabels.length === 0) {
    return `${candLabel}と指せば、${strategy}。`;
  }

  return `${candLabel}と指せば、以下${followLabels.join("、")}で${strategy}。`;
}

/** @deprecated buildCompactAim を使用 */
export function buildReadingBasedIntent(
  _moveNumber: number,
  _actualMove: string,
  candidateMove: string,
  readingLine: string,
  storedInsight?: string
): string {
  return buildCompactAim(candidateMove, readingLine, storedInsight);
}
