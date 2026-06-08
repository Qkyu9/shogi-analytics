import {
  LEGACY_MOCK_RECORD_IDS,
  SEED_RECORDS,
} from "@/app/lib/seed-records";
import type {
  GameRecordDetail,
  GameRecordDraft,
  GameRecordSummary,
} from "@/app/lib/types";

const STORAGE_KEY = "shogi-analytics-records";
const SEED_INIT_KEY = "shogi-analytics-seed-initialized";
const MIGRATED_KEY = "shogi-analytics-cloud-migrated";

function stripLegacyMocks(records: GameRecordDetail[]): GameRecordDetail[] {
  const legacy = new Set(LEGACY_MOCK_RECORD_IDS);
  return records.filter((r) => !legacy.has(r.id));
}

function loadLocalRecords(): GameRecordDetail[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GameRecordDetail[];
    return stripLegacyMocks(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

/** 初回のみローカルにシード投入（クラウド移行前のフォールバック） */
export function ensureLocalSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_INIT_KEY)) return;
  if (loadLocalRecords().length === 0 && SEED_RECORDS.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECORDS));
  }
  localStorage.setItem(SEED_INIT_KEY, "1");
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "通信に失敗しました");
  }
  return data;
}

/** ログイン後: Supabase 同期 + ローカル記録の移行 */
export async function syncCloudRecords(): Promise<void> {
  if (typeof window === "undefined") return;

  await apiFetch<{ userId: string }>("/api/auth/sync", { method: "POST" });

  if (localStorage.getItem(MIGRATED_KEY)) return;

  const local = loadLocalRecords();
  if (local.length > 0) {
    await apiFetch<{ imported: number }>("/api/records/migrate", {
      method: "POST",
      body: JSON.stringify({ records: local }),
    });
    localStorage.removeItem(STORAGE_KEY);
  }

  localStorage.setItem(MIGRATED_KEY, "1");
}

export async function saveRecord(draft: GameRecordDraft): Promise<string> {
  const { record } = await apiFetch<{ record: GameRecordDetail }>(
    "/api/records",
    {
      method: "POST",
      body: JSON.stringify(draft),
    }
  );
  return record.id;
}

export async function getAllRecordSummaries(): Promise<GameRecordSummary[]> {
  const { records } = await apiFetch<{ records: GameRecordSummary[] }>(
    "/api/records"
  );
  return records;
}

export async function getRecordDetail(
  id: string
): Promise<GameRecordDetail | null> {
  try {
    const { record } = await apiFetch<{ record: GameRecordDetail }>(
      `/api/records/${id}`
    );
    return record;
  } catch {
    return null;
  }
}

export async function getAllRecordDetails(): Promise<GameRecordDetail[]> {
  const summaries = await getAllRecordSummaries();
  const details = await Promise.all(
    summaries.map((s) => getRecordDetail(s.id))
  );
  return details.filter((d): d is GameRecordDetail => d !== null);
}

/** @deprecated syncCloudRecords を使用 */
export function ensureRecordsInitialized(): void {
  ensureLocalSeed();
}
