/** 旧タグや「ミス」付きタグを弱点分析向けの表記に正規化 */
export const MIDGAME_READ_TAG = "中盤の読み（攻めるか受けるか）";

const LEGACY_TAG_MAP: Record<string, string> = {
  "中盤の攻受判断ミス": MIDGAME_READ_TAG,
  中盤の攻受判断: MIDGAME_READ_TAG,
  "中盤の攻防判断ミス": MIDGAME_READ_TAG,
  中盤の攻防判断: MIDGAME_READ_TAG,
  "序盤の手筋ミス": "序盤の手筋選択",
  序盤の手筋: "序盤の手筋選択",
  中盤の勝ち切り不足: "勝ち切りの手筋不足",
};

export const TAGS_TO_MIGRATE_TO_MIDGAME_READ = [
  "中盤の攻受判断ミス",
  "中盤の攻受判断",
  "中盤の攻防判断ミス",
  "中盤の攻防判断",
] as const;

export function normalizeWeaknessTag(tag: string): string {
  const t = tag.replace(/^#/, "").trim();
  if (!t) return "";
  if (LEGACY_TAG_MAP[t]) return LEGACY_TAG_MAP[t];
  if (t.endsWith("ミス")) {
    const stripped = t.slice(0, -2).trim();
    if (LEGACY_TAG_MAP[stripped]) return LEGACY_TAG_MAP[stripped];
    if (LEGACY_TAG_MAP[`${stripped}ミス`]) return LEGACY_TAG_MAP[`${stripped}ミス`];
    return stripped;
  }
  return t;
}

export function migrateTagsToCurrentLabels(tags: string[]): string[] {
  const migrated = tags.map(normalizeWeaknessTag).filter(Boolean);
  return [...new Set(migrated)];
}
