import type { GameRecordDraft } from "./types";

export const DRAFT_STORAGE_KEY = "shogi-analytics-draft";

export type StoredDraft = {
  draft: GameRecordDraft;
  transcript?: string;
  rawTranscript?: string;
  /** 補正・要約前の元入力（音声STT / 貼り付けテキスト） */
  sourceInputText?: string;
};

export function saveDraft(data: StoredDraft): void {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
}

export function loadDraft(): StoredDraft | null {
  const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}
