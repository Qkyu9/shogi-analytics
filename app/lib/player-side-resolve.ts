import {
  inferPlayerSide,
  normalizePlayerSide,
  resolveHandicapFields,
  type PlayerSide,
} from "@/app/lib/handicap";
import type { GameRecordDetail } from "@/app/lib/types";

const SIDE_HINT =
  /(?:自分|私|僕|ボク|ぼく|俺)?(?:は|が)?\s*(先手|後手|下手|上手)(?:番|で|として)?/;

/** 口頭要約・元入力テキストから手番を推定 */
export function inferPlayerSideFromText(text: string): PlayerSide | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return null;

  const explicit = compact.match(SIDE_HINT);
  if (explicit) {
    const side = normalizePlayerSide(explicit[1]);
    if (side) return side;
  }

  if (/後手番|後手で|△側|△で/.test(compact)) return "gote";
  if (/先手番|先手で|▲側|▲で/.test(compact)) return "sente";

  return inferPlayerSide(compact);
}

/** 棋譜ヘッダの手合割表記から手番を推定（駒落ちのみ） */
export function inferPlayerSideFromKifu(kifuText: string): PlayerSide | null {
  for (const line of kifuText.split("\n")) {
    const t = line.trim();
    if (!/手合|駒落|HANDICAP/i.test(t)) continue;
    const side = inferPlayerSide(t);
    if (side) return side;
  }
  return null;
}

/** 棋譜分析用：記録済み手番 → 手合 → 口頭/元入力 → 棋譜ヘッダ */
export function resolvePlayerSideForRecord(
  record: Pick<
    GameRecordDetail,
    "handicap" | "playerSide" | "sourceInputText" | "positions" | "kifuText"
  >
): PlayerSide | null {
  const fromFields = resolveHandicapFields(
    record.handicap ?? "",
    record.playerSide
  );
  if (fromFields.playerSide) return fromFields.playerSide;

  const verbal = record.positions
    .flatMap((p) => [p.sceneDescription, p.defeatCause, p.lesson])
    .join("\n");
  const fromVerbal = inferPlayerSideFromText(verbal);
  if (fromVerbal) return fromVerbal;

  const fromSource = inferPlayerSideFromText(record.sourceInputText ?? "");
  if (fromSource) return fromSource;

  const fromKifu = inferPlayerSideFromKifu(record.kifuText ?? "");
  if (fromKifu) return fromKifu;

  return null;
}
