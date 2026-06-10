/** 棋神棋譜テキストから手数→指し手の対応表を抽出（事実照合用） */
export function parseKifuMoveIndex(kifuText: string): Map<number, string> {
  const index = new Map<number, string>();

  for (const line of kifuText.split("\n")) {
    const trimmed = line.trim();
    const withMark = trimmed.match(
      /^(\d+)\s*[.．]?\s*([▲△])([^\s(]+)/
    );
    if (withMark) {
      const moveNumber = Number(withMark[1]);
      const move = `${withMark[2]}${withMark[3]}`.replace(/\([^)]*\)/g, "").trim();
      if (moveNumber > 0 && move) index.set(moveNumber, move);
      continue;
    }

    const kifStyle = trimmed.match(/^(\d+)\s*[.．]?\s*(\S+?)(?:\([^)]*\))?/);
    if (!kifStyle) continue;
    const body = kifStyle[2].replace(/^[▲△]/, "");
    if (!body || /^候補|^\*\*/.test(body)) continue;
    const moveNumber = Number(kifStyle[1]);
    const side = moveNumber % 2 === 1 ? "▲" : "△";
    index.set(moveNumber, `${side}${body}`);
  }

  return index;
}

export function normalizeMoveToken(move: string): string {
  return move
    .replace(/\s+/g, "")
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30)
    )
    .replace(/[一二三四五六七八九]/g, (c) => {
      const map: Record<string, string> = {
        一: "1",
        二: "2",
        三: "3",
        四: "4",
        五: "5",
        六: "6",
        七: "7",
        八: "8",
        九: "9",
      };
      return map[c] ?? c;
    })
    .toLowerCase();
}

/** 棋譜上の手と一致するか（表記ゆれを許容） */
export function kifuMoveMatches(
  index: Map<number, string>,
  moveNumber: number,
  statedMove: string
): boolean {
  const actual = index.get(moveNumber);
  if (!actual) return true;
  const a = normalizeMoveToken(actual);
  const s = normalizeMoveToken(statedMove);
  return a === s || a.includes(s.slice(1)) || s.includes(a.slice(1));
}

export function formatKifuMoveFactBlock(kifuText: string): string {
  const index = parseKifuMoveIndex(kifuText);
  if (index.size === 0) {
    return "（棋譜から手の一覧を自動抽出できませんでした。手数・指し手は棋譜各行を直接参照すること）";
  }

  const lines = [...index.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, move]) => `${n}手: ${move}`);

  return lines.join("\n");
}
