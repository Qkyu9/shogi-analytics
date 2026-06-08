import type { GameRecordDetail, StrategyStat, TagStat } from "./types";
import { normalizeWeaknessTag } from "./weakness-tags";

export type AnalysisPeriod = "all" | "month";

export function filterRecordsByPeriod(
  records: GameRecordDetail[],
  period: AnalysisPeriod
): GameRecordDetail[] {
  if (period === "all") return records;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  return records.filter((record) => new Date(record.playedAt) >= cutoff);
}

type ResultBucket = {
  wins: number;
  losses: number;
  draws: number;
  latestRecordId: string | null;
  latestPlayedAt: string | null;
};

function bumpBucket(bucket: ResultBucket, result: GameRecordDetail["result"]) {
  if (result === "win") bucket.wins += 1;
  else if (result === "loss") bucket.losses += 1;
  else bucket.draws += 1;
}

function emptyBucket(): ResultBucket {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    latestRecordId: null,
    latestPlayedAt: null,
  };
}

function trackLatestRecord(bucket: ResultBucket, record: GameRecordDetail) {
  if (
    !bucket.latestPlayedAt ||
    new Date(record.playedAt) > new Date(bucket.latestPlayedAt)
  ) {
    bucket.latestPlayedAt = record.playedAt;
    bucket.latestRecordId = record.id;
  }
}

function bucketToStat(strategy: string, bucket: ResultBucket): StrategyStat {
  const total = bucket.wins + bucket.losses + bucket.draws;
  return {
    strategy,
    total,
    wins: bucket.wins,
    losses: bucket.losses,
    draws: bucket.draws,
    winRate: total > 0 ? Math.round((bucket.wins / total) * 100) : 0,
    latestRecordId: bucket.latestRecordId,
  };
}

export function computeStrategyStats(
  records: GameRecordDetail[],
  pick: (record: GameRecordDetail) => string
): StrategyStat[] {
  const buckets = new Map<string, ResultBucket>();

  for (const record of records) {
    const name = pick(record).trim() || "（未入力）";
    const bucket = buckets.get(name) ?? emptyBucket();
    bumpBucket(bucket, record.result);
    trackLatestRecord(bucket, record);
    buckets.set(name, bucket);
  }

  return [...buckets.entries()]
    .map(([strategy, bucket]) => bucketToStat(strategy, bucket))
    .sort((a, b) => b.total - a.total || b.winRate - a.winRate);
}

export function computeMyStrategyStats(
  records: GameRecordDetail[]
): StrategyStat[] {
  return computeStrategyStats(records, (r) => r.myStrategy);
}

export function computeOpponentStrategyStats(
  records: GameRecordDetail[]
): StrategyStat[] {
  return computeStrategyStats(records, (r) => r.opponentStrategy);
}

export function computeTagStats(records: GameRecordDetail[]): TagStat[] {
  const counts = new Map<string, number>();
  const latestByTag = new Map<string, { id: string; playedAt: string }>();

  for (const record of records) {
    for (const tag of record.tags) {
      const normalized = normalizeWeaknessTag(tag);
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      const prev = latestByTag.get(normalized);
      if (!prev || new Date(record.playedAt) > new Date(prev.playedAt)) {
        latestByTag.set(normalized, {
          id: record.id,
          playedAt: record.playedAt,
        });
      }
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: Math.round((count / total) * 100),
      latestRecordId: latestByTag.get(tag)?.id ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}
