const KANJI_ONES = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

function kanjiToArabic(kanji: string): string {
  if (kanji === "十") return "10";
  if (kanji.startsWith("十") && kanji.length === 2) {
    return String(KANJI_ONES.indexOf(kanji[1] as (typeof KANJI_ONES)[number]));
  }
  const idx = KANJI_ONES.indexOf(kanji as (typeof KANJI_ONES)[number]);
  return idx >= 0 ? String(idx) : kanji;
}

function arabicToKanjiDan(n: number): string {
  if (n <= 0) return String(n);
  if (n === 1) return "初段";
  if (n === 10) return "十段";
  if (n < 10) return `${KANJI_ONES[n]}段`;
  if (n < 20) return `十${KANJI_ONES[n - 10]}段`;
  return `${n}段`;
}

/** 級位は算用数字、段位は漢数字（初段除く）に統一 */
export function normalizeRankLabel(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  let result = text.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30)
  );

  result = result.replace(
    /([一二三四五六七八九十]+)級/g,
    (_, k: string) => `${kanjiToArabic(k)}級`
  );

  result = result.replace(/(\d+)級/g, (_, d: string) => `${Number(d)}級`);

  result = result.replace(/(\d+)段/g, (_, d: string) =>
    arabicToKanjiDan(Number(d))
  );

  result = result.replace(
    /([二三四五六七八九十]+)段/g,
    (_, k: string) => `${k}段`
  );

  return result;
}

/** 要約JSON内の段位・級位表記を正規化 */
export function normalizeRankInText(text: string): string {
  if (!text.trim()) return text;

  return text
    .replace(
      /([ウォーズ将棋会館棋の音棋桜]+)?([一二三四五六七八九十\d]+)(級|段)/g,
      (full, prefix = "", num: string, suffix: string) => {
        const label = `${prefix ?? ""}${num}${suffix}`;
        return normalizeRankLabel(label);
      }
    )
    .replace(/初段/g, "初段");
}
