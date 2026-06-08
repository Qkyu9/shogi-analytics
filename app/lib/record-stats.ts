import type { GameRecordDetail, StrategyStat, TagStat } from "./types";

type ResultBucket = { wins: number; losses: number; draws: number };

function bumpBucket(bucket: ResultBucket, result: GameRecordDetail["result"]) {
  if (result === "win") bucket.wins += 1;
  else if (result === "loss") bucket.losses += 1;
  else bucket.draws += 1;
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
  };
}

export function computeStrategyStats(
  records: GameRecordDetail[],
  pick: (record: GameRecordDetail) => string
): StrategyStat[] {
  const buckets = new Map<string, ResultBucket>();

  for (const record of records) {
    const name = pick(record).trim() || "（未入力）";
    const bucket = buckets.get(name) ?? { wins: 0, losses: 0, draws: 0 };
    bumpBucket(bucket, record.result);
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
  for (const record of records) {
    for (const tag of record.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
