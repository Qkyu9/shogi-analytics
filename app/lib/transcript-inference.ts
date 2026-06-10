import {
  normalizePlayerSide,
  resolveHandicapFields,
  type PlayerSide,
} from "@/app/lib/handicap";
import { inferPlayerSideFromText } from "@/app/lib/player-side-resolve";
import { normalizeRankLabel } from "@/app/lib/rank-notation";
import type { GamePosition, VenueType } from "@/app/lib/types";

/** 文字起こしから手合を推定 */
export function inferHandicapFromTranscript(transcript: string): string {
  const t = transcript.replace(/\s+/g, "");
  if (!t) return "";

  if (/香落[ちチ].*下手|下手.*香落/.test(t)) return "香落ち下手";
  if (/香落[ちチ].*上手|上手.*香落/.test(t)) return "香落ち上手";
  if (/角落[ちチ].*下手|下手.*角落/.test(t)) return "角落ち下手";
  if (/角落[ちチ].*上手|上手.*角落/.test(t)) return "角落ち上手";
  if (/飛車落[ちチ].*下手|下手.*飛車落/.test(t)) return "飛車落ち下手";
  if (/飛車落[ちチ].*上手|上手.*飛車落/.test(t)) return "飛車落ち上手";
  if (/平手/.test(t)) return "平手";
  if (/(?:^|[・、,])後手(?:番|で|$)/.test(t) || /後手のみ/.test(t)) return "後手";
  if (/(?:^|[・、,])先手(?:番|で|$)/.test(t)) return "先手";

  return "";
}

/** 対局形式から手合のデフォルト（駒落ち言及が無い場合） */
export function defaultHandicapForVenue(venueType: VenueType): string {
  if (venueType === "shogi_wars_10min" || venueType === "shogi_wars_sprint") {
    return "平手";
  }
  return "";
}

export function resolveHandicapFromSummary(
  handicapRaw: string,
  playerSideRaw: string | undefined,
  transcript: string,
  venueType: VenueType
): { handicap: string; playerSide: PlayerSide | null } {
  const fromAi = handicapRaw.trim();
  const fromTranscript = inferHandicapFromTranscript(transcript);
  const handicapCandidate =
    fromAi || fromTranscript || defaultHandicapForVenue(venueType);

  const sideFromAi = normalizePlayerSide(playerSideRaw);
  const sideFromTranscript = inferPlayerSideFromText(transcript);
  const playerSideRawResolved =
    sideFromAi ?? sideFromTranscript ?? playerSideRaw ?? null;

  return resolveHandicapFields(handicapCandidate, playerSideRawResolved);
}

const RANK_IN_TRANSCRIPT_RE =
  /(将棋ウォーズ|ウォーズ|棋の音|会館)\s*([初一二三四五六七八九十\d]+段|[0-9０-９一二三四五六七八九十]+級)/g;

function extractRankFromTranscript(transcript: string): string | null {
  const match = RANK_IN_TRANSCRIPT_RE.exec(transcript.replace(/\s+/g, ""));
  RANK_IN_TRANSCRIPT_RE.lastIndex = 0;
  if (!match) return null;

  const prefix = match[1].replace(/^将棋/, "");
  const body = match[2];
  return normalizeRankLabel(`${prefix}${body}`);
}

function venueRankPrefix(venueType: VenueType): string | null {
  if (venueType === "shogi_wars_10min" || venueType === "shogi_wars_sprint") {
    return "ウォーズ";
  }
  if (venueType === "kion") return "会館";
  return null;
}

/** 段位・級位に対局形式の接頭辞（ウォーズ等）を補完 */
export function enrichOpponentRank(
  rankRaw: string,
  transcript: string,
  venueType: VenueType
): string {
  const fromTranscript = extractRankFromTranscript(transcript);
  if (fromTranscript) return fromTranscript;

  const rank = normalizeRankLabel(rankRaw.trim());
  if (!rank) return "";

  if (/ウォーズ|会館|棋の音|将棋/.test(rank)) {
    return rank;
  }

  const prefix = venueRankPrefix(venueType);
  if (prefix) {
    return normalizeRankLabel(`${prefix}${rank}`);
  }

  return rank;
}

/** 口頭要約の教訓フィールド（最後に記録されたもの） */
export function pickVerbalLesson(positions: GamePosition[]): string | null {
  for (let i = positions.length - 1; i >= 0; i--) {
    const lesson = positions[i].lesson?.trim();
    if (lesson) return lesson;
  }
  return null;
}
