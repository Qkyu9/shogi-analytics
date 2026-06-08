import {
  LEGACY_MOCK_RECORD_IDS,
  SEED_RECORDS,
} from "@/app/lib/seed-records";
import type {
  GameRecordDetail,
  GameRecordDraft,
  GameRecordSummary,
  GamePosition,
} from "@/app/lib/types";
import { VENUE_OPTIONS } from "@/app/lib/types";

const STORAGE_KEY = "shogi-analytics-records";
const SEED_INIT_KEY = "shogi-analytics-seed-initialized";

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

function stripLegacyMocks(details: GameRecordDetail[]): GameRecordDetail[] {
  const legacy = new Set(LEGACY_MOCK_RECORD_IDS);
  return details.filter((r) => !legacy.has(r.id));
}

/** 旧モックを除去し、空なら実記録シードを投入する */
export function ensureRecordsInitialized(): void {
  if (typeof window === "undefined") return;

  const raw = loadSavedDetails();
  let details = stripLegacyMocks(raw);
  let changed = details.length !== raw.length;

  if (!localStorage.getItem(SEED_INIT_KEY)) {
    if (details.length === 0 && SEED_RECORDS.length > 0) {
      details = SEED_RECORDS;
      changed = true;
    }
    localStorage.setItem(SEED_INIT_KEY, "1");
  } else if (details.length === 0 && SEED_RECORDS.length > 0) {
    details = SEED_RECORDS;
    changed = true;
  }

  if (changed) {
    persistSaved(details);
  }
}

export function saveRecord(draft: GameRecordDraft): string {
  ensureRecordsInitialized();
  const id = `rec-${Date.now()}`;
  const detail = draftToDetail(draft, id);
  const existing = loadSavedDetails();
  persistSaved([detail, ...existing]);
  return id;
}

export function getSavedRecord(id: string): GameRecordDetail | null {
  ensureRecordsInitialized();
  return loadSavedDetails().find((r) => r.id === id) ?? null;
}

export function getAllRecordSummaries(): GameRecordSummary[] {
  ensureRecordsInitialized();
  return loadSavedDetails()
    .map(
      ({
        id,
        playedAt,
        venueType,
        venueLabel: vl,
        result,
        myStrategy,
        opponentStrategy,
        tags,
        positionCount,
      }) => ({
        id,
        playedAt,
        venueType,
        venueLabel: vl,
        result,
        myStrategy,
        opponentStrategy,
        tags,
        positionCount,
      })
    )
    .sort(
      (a, b) =>
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );
}

export function getRecordDetail(id: string): GameRecordDetail | null {
  return getSavedRecord(id);
}

export function getAllRecordDetails(): GameRecordDetail[] {
  ensureRecordsInitialized();
  return loadSavedDetails();
}
