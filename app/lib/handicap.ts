export type PlayerSide = "sente" | "gote";

export const PLAYER_SIDE_LABELS: Record<PlayerSide, string> = {
  sente: "先手番",
  gote: "後手番",
};

const VENUE_NOISE_PATTERNS = [
  /棋の音/g,
  /棋桜/g,
  /将棋ウォーズ/g,
  /ウォーズ/g,
  /10分?切れ/g,
  /10分30秒/g,
  /スプリント/g,
];

/** 手合フィールドに混ざった対局形式の語を除去 */
export function stripVenueFromHandicap(text: string): string {
  let value = text.trim();
  for (const pattern of VENUE_NOISE_PATTERNS) {
    value = value.replace(pattern, "");
  }
  return value.replace(/^[・\s、,／/]+|[・\s、,／/]+$/g, "").trim();
}

function compactHandicap(text: string): string {
  return text.replace(/\s+/g, "");
}

/** 駒落ち（上手/下手を含む手合）か */
export function isKomaochiHandicap(handicap: string): boolean {
  const c = compactHandicap(handicap);
  return /落ち|下手|上手/.test(c) && !/^平手/.test(c);
}

/** 手合欄に先手/後手が含まれる平手表記か */
export function isEvenHandicapWithSide(handicap: string): boolean {
  return /平手[・／]?(先手|後手)/.test(compactHandicap(handicap));
}

/** 平手のときだけ手合欄に先手/後手を付ける */
export function composeEvenHandicapLabel(
  playerSide: PlayerSide
): "平手・先手" | "平手・後手" {
  return playerSide === "sente" ? "平手・先手" : "平手・後手";
}

/** 手合の表記を統一（保存・統計のグループキー用） */
export function normalizeHandicapLabel(raw: string): string {
  const stripped = stripVenueFromHandicap(raw);
  if (!stripped) return "";

  const compact = compactHandicap(stripped);

  if (/平手/.test(compact)) {
    if (/後手/.test(compact)) return "平手・後手";
    if (/先手/.test(compact)) return "平手・先手";
    return "平手";
  }

  if (/香落ち.*下手|下手.*香落ち/.test(compact)) return "香落ち下手";
  if (/香落ち.*上手|上手.*香落ち/.test(compact)) return "香落ち上手";
  if (/角落ち.*下手|下手.*角落ち/.test(compact)) return "角落ち下手";
  if (/角落ち.*上手|上手.*角落ち/.test(compact)) return "角落ち上手";
  if (/飛車落ち.*下手|下手.*飛車落ち/.test(compact)) return "飛車落ち下手";
  if (/飛車落ち.*上手|上手.*飛車落ち/.test(compact)) return "飛車落ち上手";
  if (/飛車落ち/.test(compact)) {
    return compact.includes("上手") ? "飛車落ち上手" : "飛車落ち下手";
  }
  if (/香落ち/.test(compact)) {
    return compact.includes("上手") ? "香落ち上手" : "香落ち下手";
  }
  if (/角落ち/.test(compact)) {
    return compact.includes("上手") ? "角落ち上手" : "角落ち下手";
  }

  // 平手対局で「後手」「先手」のみ言及された場合
  if (/^後手$/.test(compact)) return "平手・後手";
  if (/^先手$/.test(compact)) return "平手・先手";

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
 * 下手→後手、上手→先手。平手は平手・先手/平手・後手表記からも読む。
 */
export function inferPlayerSide(handicap: string): PlayerSide | null {
  const compact = compactHandicap(handicap);
  if (!compact) return null;
  if (/平手.*後手|^後手/.test(compact)) return "gote";
  if (/平手.*先手|^先手/.test(compact)) return "sente";
  if (/下手/.test(compact)) return "gote";
  if (/上手/.test(compact)) return "sente";
  return null;
}

/** 画面表示用の手合1行（平手は手合欄に手番を含める） */
export function formatHandicapDisplay(
  handicap: string,
  playerSide?: PlayerSide | null
): string {
  const normalized = normalizeHandicapLabel(handicap);
  if (isEvenHandicapWithSide(normalized)) return normalized;
  if (normalized === "平手" && playerSide) {
    return composeEvenHandicapLabel(playerSide);
  }
  return normalized;
}

export function resolveHandicapFields(
  handicapRaw: string,
  playerSideRaw?: string | null
): { handicap: string; playerSide: PlayerSide | null } {
  const handicap = normalizeHandicapLabel(handicapRaw);
  /** 手合欄に先手/後手が書かれていれば、旧 playerSide より手合テキストを優先 */
  const playerSide =
    inferPlayerSide(handicap) ??
    normalizePlayerSide(playerSideRaw) ??
    null;

  if (handicap === "平手" && playerSide) {
    return {
      handicap: composeEvenHandicapLabel(playerSide),
      playerSide,
    };
  }

  return { handicap, playerSide };
}
