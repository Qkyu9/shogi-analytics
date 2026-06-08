import type { GameRecordDraft } from "./types";

const STORAGE_KEY = "shogi-analytics-transcript-cache";

export type CachedVoiceText = {
  transcript: string;
  rawTranscript?: string;
  /** 録音中に追記した生の文字起こし（将棋用語補正前・Whisperそのまま） */
  liveRawTranscript?: string;
  savedAt: string;
  draft?: GameRecordDraft;
};

export function saveTranscriptCache(data: {
  transcript: string;
  rawTranscript?: string;
  liveRawTranscript?: string;
  draft?: GameRecordDraft;
  /** 新しい録音の文字起こし時は true（古い要約を引き継がない） */
  isNewTranscript?: boolean;
}): void {
  const existing = loadTranscriptCache();
  const cached: CachedVoiceText = {
    transcript: data.transcript,
    rawTranscript: data.rawTranscript ?? existing?.rawTranscript,
    liveRawTranscript: data.liveRawTranscript ?? existing?.liveRawTranscript,
    savedAt: new Date().toISOString(),
    draft: data.isNewTranscript
      ? data.draft
      : (data.draft ?? existing?.draft),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

/** 録音中の生テキストを随時保存（エラー時の復旧用） */
export function saveLiveRawTranscript(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const existing = loadTranscriptCache();
  const cached: CachedVoiceText = {
    transcript: existing?.transcript?.trim() ? existing.transcript : trimmed,
    rawTranscript: existing?.rawTranscript,
    liveRawTranscript: trimmed,
    savedAt: new Date().toISOString(),
    draft: existing?.draft,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

export function loadTranscriptCache(): CachedVoiceText | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedVoiceText;
    const hasTranscript = Boolean(parsed.transcript?.trim());
    const hasLiveRaw = Boolean(parsed.liveRawTranscript?.trim());
    if (!hasTranscript && !hasLiveRaw) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTranscriptCache(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatCacheDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function transcriptPreview(text: string, maxLen = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen)}…`;
}
