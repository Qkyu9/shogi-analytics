export type PlayerSide = "sente" | "gote";

export const PLAYER_SIDE_LABELS: Record<PlayerSide, string> = {
  sente: "先手番",
  gote: "後手番",
};

const VENUE_NOISE_PATTERNS = [
  /棋の音/g,
  /将棋ウォーズ/g,
  /ウォーズ/g,
  /10分?切れ/g,
  /スプリント/g,
];

/** 手合フィールドに混ざった対局形式の語を除去 */
export function stripVenueFromHandicap(text: string): string {
  let value = text.trim();
  for (const pattern of VENUE_NOISE_PATTERNS) {
    value = value.replace(pattern, "");
  }
  return value.replace(/^[・\s、,]+|[・\s、,]+$/g, "").trim();
}

/** 手合の表記を統一（統計のグループキー用） */
export function normalizeHandicapLabel(raw: string): string {
  const stripped = stripVenueFromHandicap(raw);
  if (!stripped) return "";

  const compact = stripped.replace(/\s+/g, "");
  if (/平手/.test(compact)) return "平手";
  if (/香落ち.*下手|下手.*香落ち/.test(compact)) return "香落ち下手";
  if (/香落ち.*上手|上手.*香落ち/.test(compact)) return "香落ち上手";
  if (/角落ち.*下手|下手.*角落ち|角落ち.*下手/.test(compact)) return "角落ち下手";
  if (/角落ち.*上手|上手.*角落ち|角落ち.*上手/.test(compact)) return "角落ち上手";
  if (/飛車落ち.*下手|下手.*飛車落ち/.test(compact)) return "飛車落ち下手";
  if (/飛車落ち.*上手|上手.*飛車落ち/.test(compact)) return "飛車落ち上手";
  if (/飛車落ち/.test(compact)) return compact.includes("上手") ? "飛車落ち上手" : "飛車落ち下手";
  if (/香落ち/.test(compact)) return compact.includes("上手") ? "香落ち上手" : "香落ち下手";
  if (/角落ち|角落ち/.test(compact)) {
    return compact.includes("上手") ? "角落ち上手" : "角落ち下手";
  }
  if (/^後手$/.test(compact)) return "後手";
  if (/^先手$/.test(compact)) return "先手";

  return stripped;
}

export function normalizePlayerSide(value?: string | null): PlayerSide | null {
  const v = value?.trim();
  if (v === "sente" || v === "先手" || v === "先手番") return "sente";
  if (v === "gote" || v === "後手" || v === "後手番") return "gote";
  return null;
}

/**
 * 駒落ちは上手が先手（将棋のルール）。
 * 下手→後手、上手→先手。明示の先手/後手も解釈する。
 */
export function inferPlayerSide(handicap: string): PlayerSide | null {
  const compact = handicap.replace(/\s+/g, "");
  if (!compact) return null;
  if (/下手/.test(compact)) return "gote";
  if (/上手/.test(compact)) return "sente";
  if (/後手/.test(compact)) return "gote";
  if (/先手/.test(compact)) return "sente";
  return null;
}

export function resolveHandicapFields(
  handicapRaw: string,
  playerSideRaw?: string | null
): { handicap: string; playerSide: PlayerSide | null } {
  const handicap = normalizeHandicapLabel(handicapRaw);
  const playerSide =
    normalizePlayerSide(playerSideRaw) ?? inferPlayerSide(handicap);
  return { handicap, playerSide };
}
