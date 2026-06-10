import { isLikelyAttackMove } from "@/app/lib/kifu-eval-parse";
import type { GameRecordDetail, KishinTurningPoint } from "@/app/lib/types";

export type InitiativeCategory = "took" | "lost" | "even";

export type MidgameStyleRecordMetrics = {
  recordId: string;
  turningPointCount: number;
  initiativeTaken: number;
  initiativeLost: number;
  evenStruggle: number;
};

export type MidgameStyleAggregate = {
  gamesAnalyzed: number;
  /** 要所の総数（3区分すべての分母） */
  turningPointCount: number;
  initiativeTaken: number;
  initiativeTakenRate: number;
  initiativeLost: number;
  initiativeLostRate: number;
  evenStruggle: number;
  evenStruggleRate: number;
};

function parseEvalDelta(evalChange: string): number | null {
  const m = evalChange.match(/([+\-＋－]?\d+)/);
  if (!m) return null;
  const normalized = m[1].replace(/[＋]/g, "+").replace(/[－]/g, "-");
  const v = parseInt(normalized, 10);
  return Number.isNaN(v) ? null : v;
}

/** 要所1件を案Cの3区分のいずれか1つに分類（排他的） */
export function classifyTurningPoint(
  tp: KishinTurningPoint
): InitiativeCategory {
  const text = `${tp.evalChange}${tp.insight}${tp.move}`;
  const delta = parseEvalDelta(tp.evalChange);

  if (delta != null && delta <= -50) return "lost";
  if (
    /急落|失点|不利|悪化|大きく.*(落|下)|ミス|悪手|問題手|疑問手|読み違い|読み筋.*(違|誤)/.test(
      text
    )
  ) {
    return "lost";
  }
  if (/主導権.*(失|喪|渡)|流れ.*(相手|不利)|形勢.*(不利|悪化)/.test(text)) {
    return "lost";
  }

  if (delta != null && delta >= 50) return "took";
  if (
    /攻め.*(通|成功|効|継)|仕掛|優勢.*(拡|維|得)|評価.*(上|改善)|主導権.*(取|得|握)|受け.*強要|好手|成功/.test(
      text
    )
  ) {
    return "took";
  }
  if (
    isLikelyAttackMove(tp.move) &&
    !/悪|ミス|急落|不利|失点|問題/.test(text)
  ) {
    return "took";
  }

  return "even";
}

function analyzeTurningPointsForRecord(
  recordId: string,
  turningPoints: KishinTurningPoint[]
): MidgameStyleRecordMetrics {
  let initiativeTaken = 0;
  let initiativeLost = 0;
  let evenStruggle = 0;

  for (const tp of turningPoints) {
    const category = classifyTurningPoint(tp);
    if (category === "took") initiativeTaken++;
    else if (category === "lost") initiativeLost++;
    else evenStruggle++;
  }

  return {
    recordId,
    turningPointCount: turningPoints.length,
    initiativeTaken,
    initiativeLost,
    evenStruggle,
  };
}

export function analyzeMidgameStyleForRecord(
  record: GameRecordDetail
): MidgameStyleRecordMetrics | null {
  const turningPoints = record.kishinInsight?.turningPoints ?? [];
  if (turningPoints.length === 0) return null;
  return analyzeTurningPointsForRecord(record.id, turningPoints);
}

export function aggregateMidgameStyleMetrics(
  records: GameRecordDetail[]
): MidgameStyleAggregate | null {
  const perRecord = records
    .map(analyzeMidgameStyleForRecord)
    .filter((m): m is MidgameStyleRecordMetrics => m != null);

  if (perRecord.length === 0) return null;

  const totals = perRecord.reduce(
    (acc, r) => ({
      turningPointCount: acc.turningPointCount + r.turningPointCount,
      initiativeTaken: acc.initiativeTaken + r.initiativeTaken,
      initiativeLost: acc.initiativeLost + r.initiativeLost,
      evenStruggle: acc.evenStruggle + r.evenStruggle,
    }),
    {
      turningPointCount: 0,
      initiativeTaken: 0,
      initiativeLost: 0,
      evenStruggle: 0,
    }
  );

  const denom = totals.turningPointCount || 1;

  return {
    gamesAnalyzed: perRecord.length,
    turningPointCount: totals.turningPointCount,
    initiativeTaken: totals.initiativeTaken,
    initiativeTakenRate: Math.round(
      (totals.initiativeTaken / denom) * 100
    ),
    initiativeLost: totals.initiativeLost,
    initiativeLostRate: Math.round((totals.initiativeLost / denom) * 100),
    evenStruggle: totals.evenStruggle,
    evenStruggleRate: Math.round((totals.evenStruggle / denom) * 100),
  };
}
