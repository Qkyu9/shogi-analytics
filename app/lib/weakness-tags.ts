/** 旧タグや同義語を弱点分析向けの正本表記に正規化 */
export const MIDGAME_READ_TAG = "中盤の読み（攻めるか受けるか）";
export const OPENING_FORMATION_TAG = "序盤の駒組み";
export const MATE_MISS_TAG = "詰み逃し・逆転の見落とし";

/**
 * 自動生成タグの同義語 → 正本。
 * ここに無いタグ（手動で付けた固有の名詞句）はそのまま残す。
 */
const TAG_SYNONYM_MAP: Record<string, string> = {
  // 中盤の読み
  "中盤の攻受判断ミス": MIDGAME_READ_TAG,
  中盤の攻受判断: MIDGAME_READ_TAG,
  "中盤の攻防判断ミス": MIDGAME_READ_TAG,
  中盤の攻防判断: MIDGAME_READ_TAG,

  // 序盤・駒組み（正本: 序盤の駒組み）
  "序盤の手筋ミス": OPENING_FORMATION_TAG,
  序盤の手筋: OPENING_FORMATION_TAG,
  序盤の手筋選択: OPENING_FORMATION_TAG,
  駒組みの工夫: OPENING_FORMATION_TAG,
  駒組みの工夫不足: OPENING_FORMATION_TAG,

  // 終盤・詰み逃し（正本: 詰み逃し・逆転の見落とし）
  // ※ 入玉対策はより詳細な下位タグのため統合しない
  "詰め逃し・逆転の見落とし": MATE_MISS_TAG,
  "積み逃し・逆転の見落とし": MATE_MISS_TAG,
  詰めの力不足: MATE_MISS_TAG,
  詰みの力不足: MATE_MISS_TAG,
  詰め力不足: MATE_MISS_TAG,

  // その他の旧表記
  中盤の勝ち切り不足: "勝ち切りの手筋不足",
};

export const TAGS_TO_MIGRATE_TO_MIDGAME_READ = [
  "中盤の攻受判断ミス",
  "中盤の攻受判断",
  "中盤の攻防判断ミス",
  "中盤の攻防判断",
] as const;

/** DB移行・スクリプト用：同義語マップの一覧 */
export function getWeaknessTagSynonymMap(): Readonly<Record<string, string>> {
  return TAG_SYNONYM_MAP;
}

function lookupCanonical(tag: string): string | null {
  if (TAG_SYNONYM_MAP[tag]) return TAG_SYNONYM_MAP[tag];
  if (tag.endsWith("ミス")) {
    const stripped = tag.slice(0, -2).trim();
    if (TAG_SYNONYM_MAP[stripped]) return TAG_SYNONYM_MAP[stripped];
    if (TAG_SYNONYM_MAP[`${stripped}ミス`]) {
      return TAG_SYNONYM_MAP[`${stripped}ミス`];
    }
    return stripped;
  }
  return null;
}

export function normalizeWeaknessTag(tag: string): string {
  const t = tag.replace(/^#/, "").trim();
  if (!t) return "";
  return lookupCanonical(t) ?? t;
}

export function migrateTagsToCurrentLabels(tags: string[]): string[] {
  const migrated = tags.map(normalizeWeaknessTag).filter(Boolean);
  return [...new Set(migrated)];
}

/**
 * 弱点タグ → 局面フェーズ（序盤・中盤・終盤）の対応表。
 * 弱点分析の表示で上位概念にまとめるために使う。
 * 表にないタグ（手動で付けた固有のタグなど）はそのまま独立表示される。
 */
export const WEAKNESS_PHASE_MAP: Record<string, string> = {
  [OPENING_FORMATION_TAG]: "序盤",
  [MIDGAME_READ_TAG]: "中盤",
  守りの手筋選択: "中盤",
  攻めの手順選択: "中盤",
  想定外の手への対応不足: "中盤",
  勝ち切りの手筋不足: "終盤",
  寄せの読み漏れ: "終盤",
  [MATE_MISS_TAG]: "終盤",
  入玉対策: "終盤",
};

/** 弱点タグから局面フェーズを返す。対応表にない場合はそのまま返す */
export function resolveWeaknessPhase(tag: string): string {
  return WEAKNESS_PHASE_MAP[tag] ?? tag;
}
