import { buildVerbalSummaryText } from "@/app/lib/kifu-player-context";
import { generateKishinInsight } from "@/app/lib/kishin-insight-client";
import { KISHIN_INSIGHT_FORMAT_VERSION } from "@/app/lib/prompts/summarize-kifu";
import { resolvePlayerSideForRecord } from "@/app/lib/player-side-resolve";
import { detailToDraft } from "@/app/lib/record-draft";
import {
  getAllRecordDetails,
  updateRecord,
} from "@/app/lib/record-storage";
import type { GameRecordDetail } from "@/app/lib/types";

const backfillStorageKey = () =>
  `shogi-analytics-kishin-backfill-v${KISHIN_INSIGHT_FORMAT_VERSION}`;

/** 棋譜ありで示唆が未生成・旧形式の記録か */
export function needsKishinInsightRefresh(record: GameRecordDetail): boolean {
  const kifu = record.kifuText?.trim();
  if (!kifu) return false;

  if (!record.kishinInsight) return true;

  const version = record.kishinInsight.insightFormatVersion ?? 1;
  if (version < KISHIN_INSIGHT_FORMAT_VERSION) return true;

  if (record.playerSide && !record.kishinInsight.playerPerspectiveApplied) {
    return true;
  }

  return false;
}

/**
 * 旧ルールで生成された端的なまとめを、新ルール（v3）で1回だけ一括再生成する。
 * ログイン後の初回起動時にバックグラウンドで実行。
 */
export async function backfillOutdatedKishinInsights(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (localStorage.getItem(backfillStorageKey())) return 0;

  const records = await getAllRecordDetails();
  const targets = records.filter(needsKishinInsightRefresh);

  if (targets.length === 0) {
    localStorage.setItem(backfillStorageKey(), "1");
    return 0;
  }

  let updated = 0;
  for (const record of targets) {
    const kifu = record.kifuText!.trim();
    const playerSide = resolvePlayerSideForRecord(record);
    try {
      const insight = await generateKishinInsight(kifu, {
        playerSide,
        result: record.result,
        verbalSummaryText: buildVerbalSummaryText(record.positions),
      });
      await updateRecord(record.id, {
        ...detailToDraft(record),
        kishinInsight: insight,
      });
      updated++;
    } catch (err) {
      console.error(`Kishin insight backfill failed (${record.id}):`, err);
    }
  }

  localStorage.setItem(backfillStorageKey(), "1");
  return updated;
}
