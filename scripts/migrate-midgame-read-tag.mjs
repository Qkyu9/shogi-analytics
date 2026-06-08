/**
 * 既存 game_records の旧中盤タグを「中盤の読み（攻めるか受けるか）」に更新する。
 * 使い方: node scripts/migrate-midgame-read-tag.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const LEGACY_TAG_MAP = {
  "中盤の攻受判断ミス": "中盤の読み（攻めるか受けるか）",
  中盤の攻受判断: "中盤の読み（攻めるか受けるか）",
  "中盤の攻防判断ミス": "中盤の読み（攻めるか受けるか）",
  中盤の攻防判断: "中盤の読み（攻めるか受けるか）",
  "序盤の手筋ミス": "序盤の手筋選択",
  序盤の手筋: "序盤の手筋選択",
  中盤の勝ち切り不足: "勝ち切りの手筋不足",
};

function normalizeTag(tag) {
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

function loadEnvLocal() {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function migrateTags(tags) {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.from("game_records").select("id, tags");

if (error) {
  console.error("取得エラー:", error.message);
  process.exit(1);
}

const targets = (data ?? []).filter((row) => {
  const original = row.tags ?? [];
  const migrated = migrateTags(original);
  return JSON.stringify(original) !== JSON.stringify(migrated);
});

if (targets.length === 0) {
  console.log("更新対象の記録はありませんでした。");
  process.exit(0);
}

console.log(`更新対象: ${targets.length} 件`);

for (const row of targets) {
  const tags = migrateTags(row.tags ?? []);
  const { error: updateError } = await supabase
    .from("game_records")
    .update({
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updateError) {
    console.error(`id ${row.id} の更新に失敗:`, updateError.message);
    process.exit(1);
  }
  console.log(`  ${row.id}: ${JSON.stringify(row.tags)} → ${JSON.stringify(tags)}`);
}

console.log("完了しました。");
