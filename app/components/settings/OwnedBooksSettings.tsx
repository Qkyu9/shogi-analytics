"use client";

import { useEffect, useState } from "react";
import {
  BOOK_CATEGORY_LABELS,
  booksByCategory,
  type BookCategory,
} from "@/app/lib/book-catalog";
import {
  getOwnedBookIds,
  saveOwnedBookIds,
} from "@/app/lib/owned-books-storage";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export function OwnedBooksSettings() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOwnedBookIds()
      .then((ids) => {
        setSelected(new Set(ids));
        setReady(true);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "購入済み棋書の読み込みに失敗しました"
        );
        setReady(true);
      });
  }, []);

  const toggle = (bookId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const savedIds = await saveOwnedBookIds([...selected]);
      setSelected(new Set(savedIds));
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  };

  const grouped = booksByCategory();
  const categoryOrder: BookCategory[] = [
    "tsumeshogi",
    "opening",
    "midgame",
    "endgame",
    "general",
  ];

  return (
    <Card>
      <h2 className="text-sm font-semibold">購入済みの棋書</h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-sub)]">
        持っている本にチェックを入れて保存してください。学習メニューで「どの本のどの部分を読むか」が具体的に表示されます。
      </p>

      {!ready ? (
        <p className="mt-4 text-sm text-[var(--color-text-sub)]">読み込み中...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {categoryOrder.map((category) => {
            const books = grouped[category];
            if (books.length === 0) return null;
            return (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold text-[var(--color-primary)]">
                  {BOOK_CATEGORY_LABELS[category]}
                </p>
                <ul className="flex flex-col gap-2">
                  {books.map((book) => (
                    <li key={book.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(book.id)}
                          onChange={() => toggle(book.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[var(--color-text)]">
                            {book.title}
                            {book.isFamous && (
                              <span className="ml-1 text-xs font-normal text-[var(--color-primary)]">
                                定番
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--color-text-sub)]">
                            {book.studyAction}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-[var(--color-success)]">保存しました</p>
          )}

          <Button fullWidth onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "棋書の登録を保存"}
          </Button>

          <p className="text-xs text-[var(--color-text-sub)]">
            未登録でも、弱点に合う定番書（五手詰ハンドブック・寄せの手筋200など）は学習メニューで購入・学習の推薦が表示されます。
          </p>
        </div>
      )}
    </Card>
  );
}
