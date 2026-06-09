import {
  CATEGORY_COVERS_TAGS,
  DEFAULT_STUDY_ACTION,
  type BookCategory,
} from "@/app/lib/book-catalog";
import type { OwnedBook } from "@/app/lib/owned-books-storage";
import {
  FAMOUS_BOOK_IDS,
  getKnownBookById,
  findKnownBook,
} from "@/app/lib/known-books";
import {
  computeKishinTagStats,
  getKishinHighlight,
} from "@/app/lib/kishin-tag-extraction";
import {
  computeMyStrategyStats,
  computeTagStats,
} from "@/app/lib/record-stats";
import type { StudyMenuDataSource } from "@/app/lib/study-menu-settings";
import { DEFAULT_STUDY_MENU_SOURCE } from "@/app/lib/study-menu-settings";
import type { GameRecordDetail, StudyAllocation } from "@/app/lib/types";

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
  return {
    bookId: book.id ?? book.title,
    title: book.title,
    studyAction: book.studyAction || DEFAULT_STUDY_ACTION[book.category],
    reason: `${sourceNote}より弱点「${topTag}」に対し、手持ちの『${book.title}』を優先`,
    isOwned: true,
    isPurchaseSuggestion: false,
  };
}

function famousToPurchase(title: string, topTag: string): BookSuggestion | null {
  const known = findKnownBook(title);
  if (!known || !known.isFamous) return null;
  return {
    bookId: known.id,
    title: known.titles[0],
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

export function buildStudyMenu(
  records: GameRecordDetail[],
  ownedBooks: OwnedBook[],
  options?: { dataSource?: StudyMenuDataSource }
): StudyMenuResult | null {
  const dataSource = options?.dataSource ?? DEFAULT_STUDY_MENU_SOURCE;
  const tagStats =
    dataSource === "kishin"
      ? computeKishinTagStats(records)
      : computeTagStats(records);
  if (tagStats.length === 0) return null;

  const topTags = tagStats.slice(0, 3).map((s) => s.tag);
  const topTag = topTags[0];
  const strategyStats = computeMyStrategyStats(records);
  const topStrategy = strategyStats[0]?.strategy;
  const kishinHighlight =
    dataSource === "kishin" ? getKishinHighlight(records) : null;
  const sourceNote =
    dataSource === "kishin" ? "棋神からの示唆" : "口頭要約の弱点タグ";

  const ownedSorted = [...ownedBooks]
    .sort((a, b) => scoreOwnedBook(b, topTags) - scoreOwnedBook(a, topTags));

  const tsumeshogiOwned = booksForCategory(
    ownedBooks,
    "tsumeshogi",
    topTags,
    1
  );
  const midgameOwned = booksForCategory(ownedBooks, "midgame", topTags, 2);
  const endgameOwned = booksForCategory(ownedBooks, "endgame", topTags, 1);
  const defenseOwned = booksForCategory(ownedBooks, "defense", topTags, 1);

  const allocations: StudyAllocation[] = [
    {
      item: "中盤手筋",
      percentage: 40,
      reason: buildAllocationReason(
        dataSource === "kishin" && kishinHighlight
          ? `${sourceNote}より「${topTag}」が重点。${kishinHighlight}`
          : `${sourceNote}より弱点「${topTag}」が最多。${
              topStrategy ? `採用戦型は${topStrategy}。` : ""
            }中盤の判断と手筋を優先する。`,
        midgameOwned.length > 0 ? midgameOwned : defenseOwned
      ),
      books: (midgameOwned.length > 0 ? midgameOwned : defenseOwned).map(
        (b) => ({
          bookId: b.id ?? b.title,
          title: b.title,
          studyAction: b.studyAction || DEFAULT_STUDY_ACTION[b.category],
          isOwned: true,
        })
      ),
    },
    {
      item: "実戦",
      percentage: 35,
      reason: buildAllocationReason(
        `${sourceNote}を踏まえ、対局直後の振り返りとセットで弱点を定着させる。`,
        booksForCategory(ownedBooks, "opening", topTags, 1)
      ),
    },
    {
      item: "詰め将棋",
      percentage: 25,
      dailyCount: 5,
      reason: buildAllocationReason(
        `${sourceNote}で見えた読みの弱点を補うため、短い読みの維持を優先する。`,
        tsumeshogiOwned.length > 0 ? tsumeshogiOwned : endgameOwned
      ),
      books: (tsumeshogiOwned.length > 0 ? tsumeshogiOwned : endgameOwned).map(
        (b) => ({
          bookId: b.id ?? b.title,
          title: b.title,
          studyAction: b.studyAction || DEFAULT_STUDY_ACTION[b.category],
          isOwned: true,
        })
      ),
    },
  ];

  const ownedBookPicks = ownedSorted
    .slice(0, 3)
    .map((b) => ownedBookToPick(b, topTag, sourceNote));

  const purchaseSuggestions: BookSuggestion[] = [];
  const ownedTitles = new Set(ownedBooks.map((b) => b.title));

  for (const famousId of FAMOUS_BOOK_IDS) {
    const profile = getKnownBookById(famousId);
    if (!profile) continue;
    const displayTitle = profile.titles[0];
    if (ownedTitles.has(displayTitle)) continue;
    if (!profile.coversTags.some((t) => topTags.includes(t))) continue;
    const suggestion = famousToPurchase(displayTitle, topTag);
    if (suggestion) purchaseSuggestions.push(suggestion);
  }

  return {
    allocations,
    ownedBookPicks,
    purchaseSuggestions: purchaseSuggestions.slice(0, 3),
  };
}

export { DAILY_STUDY_MINUTES };
