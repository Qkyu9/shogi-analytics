"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookSuggestionsPanel } from "@/app/components/analysis/BookSuggestionsPanel";
import { StudyMenuCard } from "@/app/components/analysis/StudyMenuCard";
import { getOwnedBooks } from "@/app/lib/owned-books-storage";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import {
  buildStudyMenu,
  DAILY_STUDY_MINUTES,
  type BookSuggestion,
  type StudyMenuResult,
} from "@/app/lib/study-recommendations";
import type { StudyAllocation } from "@/app/lib/types";

export function StudyMenuView() {
  const [allocations, setAllocations] = useState<StudyAllocation[]>([]);
  const [ownedBookPicks, setOwnedBookPicks] = useState<BookSuggestion[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<
    BookSuggestion[]
  >([]);
  const [ownedBookCount, setOwnedBookCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([getAllRecordDetails(), getOwnedBooks().catch(() => [])])
      .then(([records, ownedBooks]) => {
        setOwnedBookCount(ownedBooks.length);
        const menu = buildStudyMenu(records, ownedBooks);
        if (!menu) {
          setAllocations([]);
          setOwnedBookPicks([]);
          setPurchaseSuggestions([]);
          setReady(true);
          return;
        }
        applyMenu(menu);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const applyMenu = (menu: StudyMenuResult) => {
    setAllocations(menu.allocations);
    setOwnedBookPicks(menu.ownedBookPicks);
    setPurchaseSuggestions(menu.purchaseSuggestions);
  };

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </p>
    );
  }

  if (allocations.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-sub)]">
        記録がまだありません。対局を記録すると学習メニューが表示されます。
      </p>
    );
  }

  const totalPercent = allocations.reduce((sum, a) => sum + a.percentage, 0);

  return (
    <>
      {ownedBookCount === 0 && (
        <div className="rounded-lg bg-[var(--color-bg-sub)] p-3 text-xs leading-relaxed text-[var(--color-text-sub)]">
          設定で購入済みの棋書を登録すると、学習メニューがより具体的になります。
          <Link href="/settings" className="ml-1 font-medium text-[var(--color-primary)] underline">
            設定を開く
          </Link>
        </div>
      )}

      <StudyMenuCard
        allocations={allocations}
        dailyStudyMinutes={DAILY_STUDY_MINUTES}
      />

      <BookSuggestionsPanel
        ownedBookPicks={ownedBookPicks}
        purchaseSuggestions={purchaseSuggestions}
      />

      <p className="text-center text-xs text-[var(--color-text-sub)]">
        配分合計: {totalPercent}%
      </p>
    </>
  );
}
