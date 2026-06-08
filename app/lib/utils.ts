import type { GameResult, VenueType } from "./types";
import { RESULT_LABELS, VENUE_OPTIONS } from "./types";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function venueLabel(type: VenueType): string {
  return VENUE_OPTIONS.find((v) => v.value === type)?.label ?? type;
}

export function resultLabel(result: GameResult): string {
  return RESULT_LABELS[result];
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
