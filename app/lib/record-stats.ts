import {
  isEvenHandicapWithSide,
  normalizeHandicapLabel,
  PLAYER_SIDE_LABELS,
} from "./handicap";
import { resolveParentStrategy } from "./strategy-grouping";
import type { GameRecordDetail, StrategyStat, TagStat } from "./types";
import { normalizeWeaknessTag, resolveWeaknessPhase } from "./weakness-tags";

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

function mergeBuckets(items: ResultBucket[]): ResultBucket {
  const merged = emptyBucket();
  for (const b of items) {
    merged.wins += b.wins;
    merged.losses += b.losses;
    merged.draws += b.draws;
    if (
      b.latestPlayedAt &&
      (!merged.latestPlayedAt ||
        new Date(b.latestPlayedAt) > new Date(merged.latestPlayedAt))
    ) {
      merged.latestPlayedAt = b.latestPlayedAt;
      merged.latestRecordId = b.latestRecordId;
    }
  }
  return merged;
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

function sortStats(stats: StrategyStat[]): StrategyStat[] {
  return stats.sort((a, b) => b.total - a.total || b.winRate - a.winRate);
}

export function computeStrategyStats(
  records: GameRecordDetail[],
  pick: (record: GameRecordDetail) => string,
  options?: {
    groupByParent?: boolean;
    /** 親カテゴリの決め方。省略時は戦型の対応表を使う */
    resolveParent?: (name: string) => string;
  }
): StrategyStat[] {
  const buckets = new Map<string, ResultBucket>();

  for (const record of records) {
    const name = pick(record).trim() || "（未入力）";
    const bucket = buckets.get(name) ?? emptyBucket();
    bumpBucket(bucket, record.result);
    trackLatestRecord(bucket, record);
    buckets.set(name, bucket);
  }

  if (!options?.groupByParent) {
    return sortStats(
      [...buckets.entries()].map(([strategy, bucket]) =>
        bucketToStat(strategy, bucket)
      )
    );
  }

  // 親カテゴリ（上位概念）ごとに元の名前のバケツをまとめる（最大3階層対応）
  const resolveParent = options.resolveParent ?? resolveParentStrategy;

  // 推移的に最上位の祖先を求める
  function resolveUltimate(name: string): string {
    let current = name;
    const visited = new Set<string>();
    while (true) {
      const parent = resolveParent(current);
      if (parent === current || visited.has(current)) return current;
      visited.add(current);
      current = parent;
    }
  }

  // 最上位カテゴリでグループ化
  const topGroups = new Map<string, Map<string, ResultBucket>>();
  for (const [name, bucket] of buckets) {
    const top = resolveUltimate(name);
    const group = topGroups.get(top) ?? new Map<string, ResultBucket>();
    group.set(name, bucket);
    topGroups.set(top, group);
  }

  const stats: StrategyStat[] = [];

  for (const [top, group] of topGroups) {
    const topBucket = mergeBuckets([...group.values()]);
    const topStat = bucketToStat(top, topBucket);

    // 中間カテゴリごとにリーフをまとめる（名前 → { 直接バケツ, 子バケツ群 }）
    const midMap = new Map<
      string,
      { own: ResultBucket | null; children: Map<string, ResultBucket> }
    >();

    for (const [name, bucket] of group) {
      if (name === top) continue; // 最上位と同名の直接記録はカウントに含めるが子として表示しない
      const immediate = resolveParent(name);

      if (immediate === top || immediate === name) {
        // 最上位の直接の子（自身が中間層にもなる場合はマージ）
        if (!midMap.has(name)) {
          midMap.set(name, { own: bucket, children: new Map() });
        } else {
          midMap.get(name)!.own = bucket;
        }
      } else {
        // 中間カテゴリ配下のリーフ
        const entry = midMap.get(immediate) ?? {
          own: null,
          children: new Map<string, ResultBucket>(),
        };
        entry.children.set(name, bucket);
        midMap.set(immediate, entry);
      }
    }

    if (midMap.size === 0) {
      stats.push(topStat);
      continue;
    }

    const childStats: StrategyStat[] = [];
    for (const [midName, { own, children }] of midMap) {
      const allBuckets: ResultBucket[] = [];
      if (own) allBuckets.push(own);
      allBuckets.push(...children.values());

      const midBucket = mergeBuckets(allBuckets);
      const midStat = bucketToStat(midName, midBucket);

      if (children.size > 0) {
        const grandchildren = sortStats(
          [...children.entries()].map(([n, b]) => bucketToStat(n, b))
        );
        if (grandchildren.length > 1 || grandchildren[0].strategy !== midName) {
          midStat.children = grandchildren;
        }
      }
      childStats.push(midStat);
    }

    if (childStats.length > 1 || childStats[0].strategy !== top) {
      topStat.children = sortStats(childStats);
    }
    stats.push(topStat);
  }

  return sortStats(stats);
}

export function computeMyStrategyStats(
  records: GameRecordDetail[],
  options?: { groupByParent?: boolean }
): StrategyStat[] {
  return computeStrategyStats(records, (r) => r.myStrategy, options);
}

export function computeOpponentStrategyStats(
  records: GameRecordDetail[],
  options?: { groupByParent?: boolean }
): StrategyStat[] {
  return computeStrategyStats(records, (r) => r.opponentStrategy, options);
}

export function computePlayerSideStats(
  records: GameRecordDetail[]
): StrategyStat[] {
  const withSide = records.filter(
    (r) => r.playerSide === "sente" || r.playerSide === "gote"
  );
  const stats = computeStrategyStats(withSide, (r) =>
    r.playerSide === "sente"
      ? PLAYER_SIDE_LABELS.sente
      : PLAYER_SIDE_LABELS.gote
  );
  const order = [PLAYER_SIDE_LABELS.sente, PLAYER_SIDE_LABELS.gote];
  return stats.sort(
    (a, b) => order.indexOf(a.strategy) - order.indexOf(b.strategy)
  );
}

/** 手合ラベルの上位概念（上手・下手）。末尾の表記で機械的に判定する */
function resolveHandicapParent(label: string): string {
  if (label.endsWith("上手")) return "上手";
  if (label.endsWith("下手")) return "下手";
  return label;
}

export function computeHandicapStats(
  records: GameRecordDetail[]
): StrategyStat[] {
  const withHandicap = records.filter((r) => {
    const label = normalizeHandicapLabel(r.handicap.trim());
    if (!label) return false;
    if (label === "平手") return false;
    if (isEvenHandicapWithSide(label)) return false;
    return true;
  });
  return computeStrategyStats(
    withHandicap,
    (r) => normalizeHandicapLabel(r.handicap.trim()),
    { groupByParent: true, resolveParent: resolveHandicapParent }
  );
}

export function computeTagStats(
  records: GameRecordDetail[],
  options?: { groupByPhase?: boolean }
): TagStat[] {
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

  const toStat = (tag: string): TagStat => ({
    tag,
    count: counts.get(tag) ?? 0,
    percentage: Math.round(((counts.get(tag) ?? 0) / total) * 100),
    latestRecordId: latestByTag.get(tag)?.id ?? null,
  });

  if (!options?.groupByPhase) {
    return [...counts.keys()].map(toStat).sort((a, b) => b.count - a.count);
  }

  // 局面フェーズ（序盤・中盤・終盤）ごとにタグをまとめる
  const groups = new Map<string, string[]>();
  for (const tag of counts.keys()) {
    const phase = resolveWeaknessPhase(tag);
    const group = groups.get(phase) ?? [];
    group.push(tag);
    groups.set(phase, group);
  }

  const grouped = [...groups.entries()].map(([phase, tags]) => {
    const children = tags.map(toStat).sort((a, b) => b.count - a.count);
    const count = children.reduce((sum, c) => sum + c.count, 0);

    let latest: { id: string; playedAt: string } | null = null;
    for (const tag of tags) {
      const cur = latestByTag.get(tag);
      if (
        cur &&
        (!latest || new Date(cur.playedAt) > new Date(latest.playedAt))
      ) {
        latest = cur;
      }
    }

    const stat: TagStat = {
      tag: phase,
      count,
      percentage: Math.round((count / total) * 100),
      latestRecordId: latest?.id ?? null,
    };
    // フェーズと同名のタグ1つだけなら内訳は不要
    if (children.length > 1 || children[0].tag !== phase) {
      stat.children = children;
    }
    return stat;
  });

  return grouped.sort((a, b) => b.count - a.count);
}
