/**
 * 既存 game_records の単独「右玉」を「雁木右玉」に更新するワンショットスクリプト。
 * 使い方: node scripts/fix-bare-migi-gyoku.mjs
 * 要: .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const QUALIFIED = /(雁木右玉|角換わり右玉|対振り右玉|振り飛車右玉)/;

function loadEnvLocal() {
  try {
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
  } catch {
    console.error(".env.local が見つかりません。");
    process.exit(1);
  }
}

function isBareMigiGyoku(strategy) {
  const t = (strategy ?? "").trim();
  if (!t || QUALIFIED.test(t)) return false;
  return (
    t === "右玉" ||
    t === "右翼" ||
    /^右玉[でをは]?$/.test(t) ||
    /^右翼[でをは]?$/.test(t)
  );
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Supabase の環境変数が不足しています。");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("game_records")
  .select("id, my_strategy");

if (error) {
  console.error("取得エラー:", error.message);
  process.exit(1);
}

const targets = (data ?? []).filter((row) => isBareMigiGyoku(row.my_strategy));

if (targets.length === 0) {
  console.log("更新対象の記録はありませんでした。");
  process.exit(0);
}

console.log(`更新対象: ${targets.length} 件`);

for (const row of targets) {
  const { error: updateError } = await supabase
    .from("game_records")
    .update({
      my_strategy: "雁木右玉",
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updateError) {
    console.error(`id ${row.id} の更新に失敗:`, updateError.message);
    process.exit(1);
  }
  console.log(`  ${row.id}: 「${row.my_strategy}」→ 雁木右玉`);
}

console.log("完了しました。");
