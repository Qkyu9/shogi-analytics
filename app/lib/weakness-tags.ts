/** 旧タグや「ミス」付きタグを弱点分析向けの表記に正規化 */
const LEGACY_TAG_MAP: Record<string, string> = {
  "中盤の攻受判断ミス": "攻めの手順選択",
  中盤の攻受判断: "攻めの手順選択",
  "序盤の手筋ミス": "序盤の手筋選択",
  序盤の手筋: "序盤の手筋選択",
  中盤の勝ち切り不足: "勝ち切りの手筋不足",
};

export function normalizeWeaknessTag(tag: string): string {
  const t = tag.replace(/^#/, "").trim();
  if (!t) return "";
  if (LEGACY_TAG_MAP[t]) return LEGACY_TAG_MAP[t];
  if (t.endsWith("ミス")) {
    const stripped = t.slice(0, -2).trim();
    if (LEGACY_TAG_MAP[stripped]) return LEGACY_TAG_MAP[stripped];
    return stripped;
  }
  return t;
}
