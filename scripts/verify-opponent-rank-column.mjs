/**
 * opponent_rank 列が Supabase に存在するか確認する。
 * 無い場合は supabase/migrations/20250608_opponent_rank.sql を SQL Editor で実行してください。
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { error } = await supabase
  .from("game_records")
  .select("opponent_rank")
  .limit(1);

if (error) {
  console.error(
    "opponent_rank 列がまだありません。Supabase SQL Editor で以下を実行してください:"
  );
  console.error(readFileSync("supabase/migrations/20250608_opponent_rank.sql", "utf8"));
  process.exit(1);
}

console.log("opponent_rank 列は利用可能です。");
