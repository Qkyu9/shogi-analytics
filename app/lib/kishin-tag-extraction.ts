import type { GameRecordDetail, KishinInsight, TagStat } from "@/app/lib/types";
import { MIDGAME_READ_TAG } from "@/app/lib/weakness-tags";

type TagRule = {
  tag: string;
  patterns: RegExp[];
  weight: number;
};

/** 棋神示唆のテキストから弱点タグへマッピング */
const KISHIN_TAG_RULES: TagRule[] = [
  {
    tag: MIDGAME_READ_TAG,
    patterns: [
      /中盤/,
      /ターニング/,
      /評価.*急/,
      /候補/,
      /分岐/,
      /形勢/,
      /互角/,
    ],
    weight: 3,
  },
  {
    tag: "守りの手筋選択",
    patterns: [/受け/, /守り/, /金/, /銀.*整/, /陣形/, /利き/],
    weight: 3,
  },
  {
    tag: "攻めの手順選択",
    patterns: [/攻め/, /飛車/, /桂.*上/, /伸ば/],
    weight: 2,
  },
  {
    tag: "勝ち切りの手筋不足",
    patterns: [/勝ち筋/, /挽回/, /有利.*固定/],
    weight: 2,
  },
  {
    tag: "詰み逃し・逆転の見落とし",
    patterns: [/詰み/, /Mate/, /逆転/, /投了/, /勝勢/],
    weight: 4,
  },
  {
    tag: "寄せの読み漏れ",
    patterns: [/終盤/, /寄せ/, /龍/, /成り/],
    weight: 2,
  },
  {
    tag: "想定外の手への対応不足",
    patterns: [/想定外/, /別筋/, /ずれ/, /実戦の手/],
    weight: 2,
  },
  {
    tag: "序盤の手筋選択",
    patterns: [/序盤/, /戦型/, /囲い/],
    weight: 1,
  },
];

function insightToText(insight: KishinInsight): string {
  return [
    ...insight.briefSummaries,
    ...insight.turningPoints.map(
      (tp) =>
        `${tp.moveNumber}手 ${tp.move} ${tp.evalChange} ${tp.topCandidate} ${tp.insight}`
    ),
  ].join("\n");
}

export function extractTagsFromKishinInsight(insight: KishinInsight): string[] {
  const text = insightToText(insight);
  const scores = new Map<string, number>();

  for (const rule of KISHIN_TAG_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        scores.set(rule.tag, (scores.get(rule.tag) ?? 0) + rule.weight);
        break;
      }
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  if (ranked.length > 0) return ranked.slice(0, 3);
  return [MIDGAME_READ_TAG];
}

export function computeKishinTagStats(records: GameRecordDetail[]): TagStat[] {
  const counts = new Map<string, number>();
  const latestByTag = new Map<string, { id: string; playedAt: string }>();

  for (const record of records) {
    if (!record.kishinInsight) continue;
    const tags = extractTagsFromKishinInsight(record.kishinInsight);
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
      const prev = latestByTag.get(tag);
      if (!prev || new Date(record.playedAt) > new Date(prev.playedAt)) {
        latestByTag.set(tag, { id: record.id, playedAt: record.playedAt });
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

export function getKishinHighlight(records: GameRecordDetail[]): string | null {
  const withInsight = records
    .filter((r) => r.kishinInsight)
    .sort(
      (a, b) =>
        new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );

  const latest = withInsight[0]?.kishinInsight;
  if (!latest) return null;
  return latest.briefSummaries.find((s) => s.trim()) ?? null;
}

export function countRecordsWithKishinInsight(
  records: GameRecordDetail[]
): number {
  return records.filter((r) => r.kishinInsight).length;
}
