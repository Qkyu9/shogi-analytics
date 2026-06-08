/**
 * 口頭の「右玉」を文脈に応じた戦型名に展開する。
 *
 * 雁木右玉: 六七銀・七八金型の雁木の構えのうえ四八玉と玉を右に持つ形。
 * 相手が雁木でなくても「雁木右玉」と呼ぶ（居飛車の右翼攻めのデフォルト）。
 */

const QUALIFIED_PATTERN = /(雁木右玉|角換わり右玉|対振り右玉|振り飛車右玉)/;

const BARE_MIGI_GYOKU = /(?<!角換わり|対振り|雁木|振り飛車)(右玉|右翼)/g;

type MigiGyokuVariant = "gangi" | "kakugawari" | "taifuri";

function detectMigiGyokuVariant(context: string): MigiGyokuVariant {
  if (/角換わり|角がわり|角代わり|角換り|角道を割|角を換/.test(context)) {
    return "kakugawari";
  }
  if (
    /振り飛車|振飛車|対振り|相手が振|相手の振|振り飛車だった|振り飛車で/.test(
      context
    )
  ) {
    return "taifuri";
  }
  return "gangi";
}

function variantLabel(variant: MigiGyokuVariant): string {
  switch (variant) {
    case "kakugawari":
      return "角換わり右玉";
    case "taifuri":
      return "対振り右玉";
    default:
      return "雁木右玉";
  }
}

/** 単独の「右玉」「右翼」（戦型として）を文脈付きの正式名に置換 */
export function resolveMigiGyokuInText(text: string): string {
  if (!text.trim()) return text;

  const variant = detectMigiGyokuVariant(text);
  const label = variantLabel(variant);

  return text.replace(BARE_MIGI_GYOKU, (match, _term, offset, whole) => {
    const before = whole.slice(Math.max(0, offset - 8), offset);
    if (/(角換わり|対振り|雁木|振り飛車)$/.test(before)) return match;
    return label;
  });
}

/** DB保存済みの戦型が単独の「右玉」か（角換わり右玉・対振り右玉・雁木右玉は除外） */
export function isBareMigiGyokuStrategy(strategy: string): boolean {
  const t = strategy.trim();
  if (!t) return false;
  if (QUALIFIED_PATTERN.test(t)) return false;
  return (
    t === "右玉" ||
    t === "右翼" ||
    /^右玉[でをは]?$/.test(t) ||
    /^右翼[でをは]?$/.test(t)
  );
}

/** 単独の「右玉」を雁木右玉に直す（既存記録のデータ修正用） */
export function bareMigiGyokuToGangi(strategy: string): string {
  return isBareMigiGyokuStrategy(strategy) ? "雁木右玉" : strategy.trim();
}

/** myStrategy フィールド用。既に正式名ならそのまま、単独の「右玉」なら展開 */
export function resolveMyStrategy(strategy: string, transcript?: string): string {
  const trimmed = strategy.trim();
  if (!trimmed) return trimmed;
  if (QUALIFIED_PATTERN.test(trimmed)) return trimmed;

  const bare =
    trimmed === "右玉" ||
    trimmed === "右翼" ||
    /^右玉[でをは]?$/.test(trimmed) ||
    /^右翼[でをは]?$/.test(trimmed);

  if (!bare) {
    return resolveMigiGyokuInText(trimmed);
  }

  const context = transcript?.trim() || trimmed;
  return variantLabel(detectMigiGyokuVariant(context));
}
