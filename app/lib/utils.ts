import type { GameResult, VenueType } from "./types";
import { RESULT_LABELS, VENUE_OPTIONS } from "./types";

const JST = "Asia/Tokyo";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: JST,
    month: "numeric",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 日時入力欄用：ISO → 日本時間の yyyy-MM-ddTHH:mm */
export function toDatetimeLocalJst(iso: string): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** 日時入力欄用：日本時間の yyyy-MM-ddTHH:mm → ISO（UTC） */
export function fromDatetimeLocalJst(value: string): string {
  const normalized = value.length === 16 ? `${value}:00` : value;
  return new Date(`${normalized}+09:00`).toISOString();
}

export function venueLabel(type: VenueType): string {
  return VENUE_OPTIONS.find((v) => v.value === type)?.label ?? type;
}

export function resultLabel(result: GameResult): string {
  return RESULT_LABELS[result];
}

/** 一覧・詳細用：相手の戦型と段位・級位を1行に */
export function formatOpponentMatchLine(
  opponentStrategy: string,
  opponentRank?: string
): string {
  const strategy = opponentStrategy.trim();
  const rank = opponentRank?.trim() ?? "";
  if (strategy && rank) return `${strategy}（${rank}）`;
  return strategy || rank || "（未入力）";
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
