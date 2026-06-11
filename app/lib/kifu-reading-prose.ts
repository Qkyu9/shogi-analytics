import { extractMarkedMoves } from "@/app/lib/kifu-line-parse";

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

/** 符号付き指し手を短い日本語に変換（持ち駒の推測はしない） */
export function describeShogiMove(move: string): string {
  const body = move.replace(/^[▲△]/, "").trim();
  if (!body) return "指し手";

  if (/打/.test(body)) {
    const dest = body.match(/^([０-９0-9一二三四五六七八九]+)/)?.[1] ?? "";
    const piece = normalizePieceLabel(body.replace(/打.*/, ""));
    return dest ? `${dest}に${piece}を打つ` : `${piece}を打つ`;
  }

  const fromMatch = body.match(/^(.+?)\((\d+)\)$/);
  if (fromMatch) {
    const main = fromMatch[1].trim();
    const from = fromMatch[2];
    const piece = normalizePieceLabel(main);
    if (/^同/.test(main)) {
      return `${from}の${piece}で同マスに`;
    }
    const dest = main.replace(/^同\s*/, "").match(/^([０-９0-9一二三四五六七八九]+)/)?.[1];
    if (dest) {
      return `盤上${from}の${piece}を${dest}へ`;
    }
    return `${from}の${piece}を動かす`;
  }

  const simple = body.match(/^([０-９0-9一二三四五六七八九]+)(.+)/);
  if (simple) {
    const piece = normalizePieceLabel(simple[2]);
    return `${piece}を${simple[1]}へ`;
  }

  return body;
}

/** 読み筋を数手分、文章で要約 */
export function summarizeReadingAsProse(
  readingLine: string,
  maxMoves = 5
): string {
  const moves = extractMarkedMoves(readingLine).slice(0, maxMoves);
  if (moves.length === 0) return "";

  const parts = moves.map(describeShogiMove);
  if (parts.length === 1) return `${parts[0]}流れ`;
  return `${parts.join("、")}、といった流れ`;
}

/** 保存済みAI文が棋譜事実と矛盾するか（持ち駒・取得の創作など） */
export function aiIntentContradictsKifu(
  aiText: string,
  candidateMove: string,
  readingLine: string
): boolean {
  const ai = aiText.trim();
  if (!ai) return false;

  if (!/手に入れ|獲得|取った|持ち駒|新たに/.test(ai)) {
    return false;
  }

  const moves = [
    candidateMove,
    ...extractMarkedMoves(readingLine).slice(0, 4),
  ].filter(Boolean);

  return moves.some((m) => {
    const body = m.replace(/^[▲△]/, "");
    return /\(\d+\)/.test(m) && !/打/.test(body);
  });
}

/** 本譜・候補・読み筋から狙い文を機械生成 */
export function buildReadingBasedIntent(
  moveNumber: number,
  actualMove: string,
  candidateMove: string,
  readingLine: string
): string {
  const actualDesc = describeShogiMove(actualMove);
  const candDesc = describeShogiMove(candidateMove);
  const flow = summarizeReadingAsProse(readingLine, 4);

  if (flow) {
    return `${moveNumber}手目では${actualDesc}を選んだが、${candDesc}と進めば${flow}を作れる。`;
  }

  return `${moveNumber}手目では${actualDesc}を選んだが、${candDesc}という手もあった。`;
}
