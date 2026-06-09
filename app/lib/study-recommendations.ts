import {
  BOOK_CATALOG,
  getBookById,
  type BookCatalogEntry,
} from "@/app/lib/book-catalog";
import {
  computeMyStrategyStats,
  computeTagStats,
} from "@/app/lib/record-stats";
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

function scoreBookForTags(book: BookCatalogEntry, topTags: string[]): number {
  return book.coversTags.filter((tag) => topTags.includes(tag)).length;
}

function pickBooks(
  topTags: string[],
  ownedBookIds: string[],
  limit: number
): { owned: BookCatalogEntry[]; purchase: BookCatalogEntry[] } {
  const scored = BOOK_CATALOG.map((book) => ({
    book,
    score: scoreBookForTags(book, topTags),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.book.isFamous) - Number(a.book.isFamous));

  const owned: BookCatalogEntry[] = [];
  const purchase: BookCatalogEntry[] = [];

  for (const { book } of scored) {
    if (ownedBookIds.includes(book.id)) {
      if (owned.length < limit) owned.push(book);
    } else if (book.isFamous && purchase.length < limit) {
      purchase.push(book);
    }
  }

  return { owned, purchase };
}

function bookToSuggestion(
  book: BookCatalogEntry,
  topTag: string,
  isOwned: boolean
): BookSuggestion {
  return {
    bookId: book.id,
    title: book.title,
    studyAction: book.studyAction,
    reason: isOwned
      ? `弱点「${topTag}」に対し、手持ちの本から優先して取り組む`
      : book.purchaseReason,
    isOwned,
    isPurchaseSuggestion: !isOwned,
  };
}

function buildAllocationReason(
  base: string,
  books: BookCatalogEntry[],
  ownedBookIds: string[]
): string {
  const owned = books.filter((b) => ownedBookIds.includes(b.id));
  if (owned.length === 0) return base;
  const titles = owned.map((b) => `『${b.title}』`).join("、");
  return `${base} 手持ちの${titles}から、${owned[0].studyAction}。`;
}

export function buildStudyMenu(
  records: GameRecordDetail[],
  ownedBookIds: string[]
): StudyMenuResult | null {
  const tagStats = computeTagStats(records);
  if (tagStats.length === 0) return null;

  const topTags = tagStats.slice(0, 3).map((s) => s.tag);
  const topTag = topTags[0];
  const strategyStats = computeMyStrategyStats(records);
  const topStrategy = strategyStats[0]?.strategy;

  const { owned, purchase } = pickBooks(topTags, ownedBookIds, 3);

  const tsumeshogiBooks = BOOK_CATALOG.filter(
    (b) =>
      b.category === "tsumeshogi" &&
      b.coversTags.some((t) => topTags.includes(t))
  );
  const midgameBooks = BOOK_CATALOG.filter(
    (b) =>
      b.category === "midgame" &&
      b.coversTags.some((t) => topTags.includes(t))
  );

  const allocations: StudyAllocation[] = [
    {
      item: "中盤手筋",
      percentage: 40,
      reason: buildAllocationReason(
        `弱点タグ「${topTag}」が最多。${
          topStrategy ? `採用戦型は${topStrategy}。` : ""
        }中盤の判断と手筋を優先する。`,
        midgameBooks,
        ownedBookIds
      ),
      books: midgameBooks
        .filter((b) => ownedBookIds.includes(b.id))
        .slice(0, 2)
        .map((b) => ({
          bookId: b.id,
          title: b.title,
          studyAction: b.studyAction,
          isOwned: true,
        })),
    },
    {
      item: "実戦",
      percentage: 35,
      reason: buildAllocationReason(
        "対局直後の振り返りとセットで弱点を定着させる。記録した敗因タグを意識して次の対局へ。",
        owned.filter((b) => b.category === "opening"),
        ownedBookIds
      ),
    },
    {
      item: "詰め将棋",
      percentage: 25,
      dailyCount: 5,
      reason: buildAllocationReason(
        "短い読みの維持。終盤の読み漏れ防止にもつながる。",
        tsumeshogiBooks,
        ownedBookIds
      ),
      books: tsumeshogiBooks
        .filter((b) => ownedBookIds.includes(b.id))
        .slice(0, 1)
        .map((b) => ({
          bookId: b.id,
          title: b.title,
          studyAction: b.studyAction,
          isOwned: true,
        })),
    },
  ];

  const ownedBookPicks = owned.map((book) =>
    bookToSuggestion(book, topTag, true)
  );
  const purchaseSuggestions = purchase.map((book) =>
    bookToSuggestion(book, topTag, false)
  );

  // 定番書で弱点に直結するが未登録のものを購入推薦に追加
  for (const famousId of ["gote-handbook", "yose-200"] as const) {
    const book = getBookById(famousId);
    if (!book || ownedBookIds.includes(book.id)) continue;
    if (!book.coversTags.some((t) => topTags.includes(t))) continue;
    if (purchaseSuggestions.some((s) => s.bookId === book.id)) continue;
    purchaseSuggestions.push(bookToSuggestion(book, topTag, false));
  }

  return {
    allocations,
    ownedBookPicks,
    purchaseSuggestions: purchaseSuggestions.slice(0, 3),
  };
}

export { DAILY_STUDY_MINUTES };
