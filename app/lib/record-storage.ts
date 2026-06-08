import {
  mockRecordDetails,
  mockRecords,
} from "@/app/lib/mock-data";
import type {
  GameRecordDetail,
  GameRecordDraft,
  GameRecordSummary,
  GamePosition,
} from "@/app/lib/types";
import { VENUE_OPTIONS } from "@/app/lib/types";

const STORAGE_KEY = "shogi-analytics-records";

function isNonEmptyPosition(pos: GamePosition): boolean {
  return !!(
    pos.sceneDescription.trim() ||
    pos.defeatCause.trim() ||
    pos.correctMove.trim() ||
    pos.lesson.trim()
  );
}

function venueLabel(type: GameRecordDraft["venueType"]): string {
  return VENUE_OPTIONS.find((v) => v.value === type)?.label ?? type;
}

function draftToDetail(draft: GameRecordDraft, id: string): GameRecordDetail {
  const positions = draft.positions
    .filter(isNonEmptyPosition)
    .map((p, index) => ({
      sceneDescription: p.sceneDescription.trim(),
      defeatCause: p.defeatCause.trim(),
      correctMove: p.correctMove.trim(),
      lesson: p.lesson.trim(),
      sortOrder: index,
    }));

  return {
    id,
    playedAt: draft.playedAt,
    venueType: draft.venueType,
    venueLabel: venueLabel(draft.venueType),
    result: draft.result,
    myStrategy: draft.myStrategy.trim(),
    opponentStrategy: draft.opponentStrategy.trim(),
    tags: draft.tags,
    positionCount: positions.length,
    positions,
    kifuText: draft.kifuText?.trim() || undefined,
  };
}

function loadSavedDetails(): GameRecordDetail[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GameRecordDetail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSaved(details: GameRecordDetail[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
}

export function saveRecord(draft: GameRecordDraft): string {
  const id = `rec-${Date.now()}`;
  const detail = draftToDetail(draft, id);
  const existing = loadSavedDetails();
  persistSaved([detail, ...existing]);
  return id;
}

export function getSavedRecord(id: string): GameRecordDetail | null {
  return loadSavedDetails().find((r) => r.id === id) ?? null;
}

export function getAllRecordSummaries(): GameRecordSummary[] {
  const saved = loadSavedDetails();
  const savedIds = new Set(saved.map((r) => r.id));
  const mockOnly = mockRecords.filter((r) => !savedIds.has(r.id));

  return [...saved, ...mockOnly].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );
}

export function getRecordDetail(id: string): GameRecordDetail | null {
  const saved = getSavedRecord(id);
  if (saved) return saved;
  return mockRecordDetails[id] ?? null;
}
