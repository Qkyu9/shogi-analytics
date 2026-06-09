"use client";

import { useState } from "react";
import { Card } from "@/app/components/ui/Card";
import {
  DEFAULT_STUDY_MENU_SOURCE,
  getStudyMenuDataSource,
  setStudyMenuDataSource,
  STUDY_MENU_SOURCE_LABELS,
  type StudyMenuDataSource,
} from "@/app/lib/study-menu-settings";

const OPTIONS: StudyMenuDataSource[] = ["kishin", "verbal", "both"];

const OPTION_DESCRIPTIONS: Record<StudyMenuDataSource, string> = {
  kishin:
    "棋神アナリティクスの評価・候補手から抽出した示唆をもとに提案します。",
  verbal: "口頭振り返りの要約と敗因タグをもとに提案します。",
  both: "棋神からの示唆と口頭要約の両方を組み合わせて提案します。",
};

export function StudyMenuSourceSettings() {
  const [source, setSource] = useState<StudyMenuDataSource>(() =>
    typeof window === "undefined"
      ? DEFAULT_STUDY_MENU_SOURCE
      : getStudyMenuDataSource()
  );

  const handleChange = (next: StudyMenuDataSource) => {
    setSource(next);
    setStudyMenuDataSource(next);
  };

  return (
    <Card>
      <h2 className="text-sm font-semibold">学習メニューの参照元</h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-sub)]">
        学習メニューの弱点分析に使うデータを選べます。標準は棋神からの示唆です。
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {OPTIONS.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
              source === value
                ? "border-[var(--color-primary)] bg-[var(--color-bg-sub)]"
                : "border-[var(--color-border)]"
            }`}
          >
            <input
              type="radio"
              name="study-menu-source"
              value={value}
              checked={source === value}
              onChange={() => handleChange(value)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--color-text)]">
                {STUDY_MENU_SOURCE_LABELS[value]}
                {value === DEFAULT_STUDY_MENU_SOURCE && (
                  <span className="ml-1 text-xs font-normal text-[var(--color-text-sub)]">
                    （標準）
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-sub)]">
                {OPTION_DESCRIPTIONS[value]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
