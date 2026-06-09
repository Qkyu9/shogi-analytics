"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookSuggestionsPanel } from "@/app/components/analysis/BookSuggestionsPanel";
import { StudyMenuCard } from "@/app/components/analysis/StudyMenuCard";
import { countRecordsWithKishinInsight } from "@/app/lib/kishin-tag-extraction";
import { getOwnedBooks } from "@/app/lib/owned-books-storage";
import { getAllRecordDetails } from "@/app/lib/record-storage";
import {
  getStudyMenuDataSource,
  STUDY_MENU_SOURCE_LABELS,
  type StudyMenuDataSource,
} from "@/app/lib/study-menu-settings";
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
  const [dataSource, setDataSource] = useState<StudyMenuDataSource>("kishin");
  const [recordCount, setRecordCount] = useState(0);
  const [kishinRecordCount, setKishinRecordCount] = useState(0);

  useEffect(() => {
    const source = getStudyMenuDataSource();
    setDataSource(source);

    Promise.all([getAllRecordDetails(), getOwnedBooks().catch(() => [])])
      .then(([records, ownedBooks]) => {
        setRecordCount(records.length);
        setKishinRecordCount(countRecordsWithKishinInsight(records));
        setOwnedBookCount(ownedBooks.length);
        const menu = buildStudyMenu(records, ownedBooks, { dataSource: source });
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
    let message =
      "記録がまだありません。対局を記録すると学習メニューが表示されます。";

    if (recordCount > 0 && dataSource === "kishin" && kishinRecordCount === 0) {
      message =
        "棋神からの示唆がある記録がまだありません。記録に棋譜を貼り付けて保存するか、設定で「口頭要約」を参照元に切り替えてください。";
    } else if (recordCount > 0 && dataSource === "verbal") {
      message =
        "口頭要約の敗因タグがまだありません。対局記録の振り返りを追加してください。";
    }

    return (
      <p className="text-center text-sm leading-relaxed text-[var(--color-text-sub)]">
        {message}
        <Link
          href="/settings"
          className="mt-2 block font-medium text-[var(--color-primary)] underline"
        >
          設定を開く
        </Link>
      </p>
    );
  }

  const totalPercent = allocations.reduce((sum, a) => sum + a.percentage, 0);

  return (
    <>
      <div className="rounded-lg bg-[var(--color-bg-sub)] p-3 text-xs leading-relaxed text-[var(--color-text-sub)]">
        参照元: <span className="font-medium">{STUDY_MENU_SOURCE_LABELS[dataSource]}</span>
        <Link href="/settings" className="ml-2 font-medium text-[var(--color-primary)] underline">
          変更
        </Link>
      </div>

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
