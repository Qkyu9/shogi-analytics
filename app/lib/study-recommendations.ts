import {
  CATEGORY_COVERS_TAGS,
  DEFAULT_STUDY_ACTION,
  type BookCategory,
} from "@/app/lib/book-catalog";
import type { OwnedBook } from "@/app/lib/owned-books-storage";
import {
  FAMOUS_BOOK_IDS,
  getCanonicalBookTitle,
  getKnownBookById,
  findKnownBook,
  isBookOwned,
} from "@/app/lib/known-books";
import {
  computeCombinedTagStats,
  computeKishinTagStats,
  getKishinHighlight,
} from "@/app/lib/kishin-tag-extraction";
import {
  computeMyStrategyStats,
  computeTagStats,
} from "@/app/lib/record-stats";
import type { StudyMenuDataSource } from "@/app/lib/study-menu-settings";
import { DEFAULT_STUDY_MENU_SOURCE } from "@/app/lib/study-menu-settings";
import type { GameRecordDetail, StudyAllocation, TagStat } from "@/app/lib/types";
import { resolveWeaknessPhase } from "@/app/lib/weakness-tags";

export type BookSuggestion = {
  bookId: string;
  title: string;
  studyAction: string;
  reason: string;
  isOwned: boolean;
  isPurchaseSuggestion: boolean;
};

export type StudyMenuResult = {
  allocations: StudyAllocation[];
  ownedBookPicks: BookSuggestion[];
  purchaseSuggestions: BookSuggestion[];
};

const DAILY_STUDY_MINUTES = 60;

function scoreOwnedBook(book: OwnedBook, topTags: string[]): number {
  const categoryTags = CATEGORY_COVERS_TAGS[book.category] ?? [];
  const tagHits = categoryTags.filter((t) => topTags.includes(t)).length;
  const titleHits =
    findKnownBook(book.title)?.coversTags.filter((t) => topTags.includes(t))
      .length ?? 0;
  return tagHits + titleHits;
}

function ownedBookToPick(
  book: OwnedBook,
  topTag: string,
  sourceNote: string
): BookSuggestion {
  const displayTitle = getCanonicalBookTitle(book.title);
  return {
    bookId: book.id ?? displayTitle,
    title: displayTitle,
    studyAction: book.studyAction || DEFAULT_STUDY_ACTION[book.category],
    reason: `${sourceNote}より弱点「${topTag}」に対し、手持ちの『${displayTitle}』を優先`,
    isOwned: true,
    isPurchaseSuggestion: false,
  };
}

function famousToPurchase(title: string): BookSuggestion | null {
  const known = findKnownBook(title);
  if (!known || !known.isFamous) return null;
  return {
    bookId: known.id,
    title: known.canonicalTitle,
    studyAction: known.studyAction,
    reason: known.purchaseReason,
    isOwned: false,
    isPurchaseSuggestion: true,
  };
}

function booksForCategory(
  ownedBooks: OwnedBook[],
  category: BookCategory,
  topTags: string[],
  limit: number
): OwnedBook[] {
  return ownedBooks
    .filter((b) => b.category === category)
    .sort((a, b) => scoreOwnedBook(b, topTags) - scoreOwnedBook(a, topTags))
    .slice(0, limit);
}

function buildAllocationReason(
  base: string,
  books: OwnedBook[]
): string {
  if (books.length === 0) return base;
  const first = books[0];
  return `${base} 手持ちの『${first.title}』で、${first.studyAction || DEFAULT_STUDY_ACTION[first.category]}。`;
}

/**
 * 弱点タグを局面フェーズ（序盤・中盤・終盤）に集約し、最も多いフェーズを返す。
 * フェーズに対応しないタグは集計から除外。1つも対応しない場合は中盤
 * （＝実戦と振り返りで鍛える、このアプリの基本方針）とする。
 */
function detectTopWeaknessPhase(tagStats: TagStat[]): string {
  const phaseCounts = new Map<string, number>();
  for (const stat of tagStats) {
    const phase = resolveWeaknessPhase(stat.tag);
    if (phase === "序盤" || phase === "中盤" || phase === "終盤") {
      phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + stat.count);
    }
  }
  const top = [...phaseCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? "中盤";
}

export function buildStudyMenu(
  records: GameRecordDetail[],
  ownedBooks: OwnedBook[],
  options?: { dataSource?: StudyMenuDataSource }
): StudyMenuResult | null {
  const dataSource = options?.dataSource ?? DEFAULT_STUDY_MENU_SOURCE;
  const verbalTagStats = computeTagStats(records);
  const tagStats =
    dataSource === "kishin"
      ? computeKishinTagStats(records)
      : dataSource === "verbal"
        ? verbalTagStats
        : computeCombinedTagStats(records, verbalTagStats);
  if (tagStats.length === 0) return null;

  const topTags = tagStats.slice(0, 3).map((s) => s.tag);
  const topTag = topTags[0];
  const strategyStats = computeMyStrategyStats(records);
  const topStrategy = strategyStats[0]?.strategy;
  const kishinHighlight =
    dataSource === "kishin" || dataSource === "both"
      ? getKishinHighlight(records)
      : null;
  const sourceNote =
    dataSource === "kishin"
      ? "棋神からの示唆"
      : dataSource === "verbal"
        ? "口頭要約の弱点タグ"
        : "棋神からの示唆と口頭要約";

  const ownedSorted = [...ownedBooks]
    .sort((a, b) => scoreOwnedBook(b, topTags) - scoreOwnedBook(a, topTags));

  // 診断：弱点が最も多い局面フェーズを特定し、処方（配分と本）を切り替える
  const topPhase = detectTopWeaknessPhase(tagStats);

  const tsumeshogiOwned = booksForCategory(
    ownedBooks,
    "tsumeshogi",
    topTags,
    1
  );
  const endgameOwned = booksForCategory(ownedBooks, "endgame", topTags, 1);
  const defenseOwned = booksForCategory(ownedBooks, "defense", topTags, 1);
  const openingOwned = booksForCategory(ownedBooks, "opening", topTags, 2);
  const generalOwned = booksForCategory(ownedBooks, "general", topTags, 1);

  // 終盤枠は「最終盤（詰将棋）」と「その手前（寄せ・受け）」の本を合わせて出す
  const endgameBooks = [...tsumeshogiOwned, ...endgameOwned, ...defenseOwned];

  const toPicks = (books: OwnedBook[]) =>
    books.length > 0
      ? books.map((b) => ({
          bookId: b.id ?? b.title,
          title: b.title,
          studyAction: b.studyAction || DEFAULT_STUDY_ACTION[b.category],
          isOwned: true,
        }))
      : undefined;

  // 診断結果の一文（重点フェーズの枠の説明文に付ける）
  const diagnosisNote =
    (dataSource === "kishin" || dataSource === "both") && kishinHighlight
      ? `${sourceNote}より「${topTag}」が重点。${kishinHighlight}`
      : `${sourceNote}より弱点「${topTag}」が最多。`;

  const withDiagnosis = (phase: string, base: string) =>
    topPhase === phase ? `${diagnosisNote} ${base}` : base;

  const endgameSlot = (percentage: number): StudyAllocation => ({
    item: "終盤（詰将棋・寄せ・受け）",
    percentage,
    dailyCount: 5,
    reason: buildAllocationReason(
      withDiagnosis(
        "終盤",
        "詰みの精度（最終盤）と、その手前の寄せ・受けの判断を合わせて鍛える。"
      ),
      endgameBooks
    ),
    books: toPicks(endgameBooks),
  });

  const practiceSlot = (percentage: number): StudyAllocation => ({
    item: "実戦＋振り返り",
    percentage,
    reason: withDiagnosis(
      "中盤",
      "中盤力は本ではなく、実戦とこのアプリでの振り返りで鍛える。対局直後に音声で振り返りを記録して弱点を定着させる。"
    ),
  });

  const openingSlot = (percentage: number): StudyAllocation => ({
    item: "序盤（戦型・定跡）",
    percentage,
    reason: buildAllocationReason(
      withDiagnosis(
        "序盤",
        topStrategy
          ? `採用戦型（${topStrategy}）の定跡精度を上げる。`
          : "採用戦型の定跡精度を上げる。"
      ),
      openingOwned
    ),
    books: toPicks(openingOwned),
  });

  const visionSlot = (percentage: number): StudyAllocation => ({
    item: "大局観・構想",
    percentage,
    reason: buildAllocationReason(
      "一局を貫く方針・構想の立て方を学び、中盤の判断の土台を作る。",
      generalOwned
    ),
    books: toPicks(generalOwned),
  });

  // 診断フェーズ別の処方パターン
  const allocations: StudyAllocation[] =
    topPhase === "終盤"
      ? [endgameSlot(45), practiceSlot(35), openingSlot(20)]
      : topPhase === "序盤"
        ? [practiceSlot(40), openingSlot(35), endgameSlot(25)]
        : [practiceSlot(50), endgameSlot(35), visionSlot(15)];

  const ownedBookPicks = ownedSorted
    .slice(0, 3)
    .map((b) => ownedBookToPick(b, topTag, sourceNote));

  const purchaseSuggestions: BookSuggestion[] = [];

  for (const famousId of FAMOUS_BOOK_IDS) {
    const profile = getKnownBookById(famousId);
    if (!profile) continue;
    const displayTitle = profile.canonicalTitle;
    if (isBookOwned(ownedBooks, profile)) continue;
    if (!profile.coversTags.some((t) => topTags.includes(t))) continue;
    const suggestion = famousToPurchase(displayTitle);
    if (suggestion) purchaseSuggestions.push(suggestion);
  }

  return {
    allocations,
    ownedBookPicks,
    purchaseSuggestions: purchaseSuggestions.slice(0, 3),
  };
}

export { DAILY_STUDY_MINUTES };
