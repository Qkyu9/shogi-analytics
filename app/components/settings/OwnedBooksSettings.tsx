"use client";

import { useEffect, useState } from "react";
import {
  BOOK_CATEGORY_LABELS,
  BOOK_CATEGORY_OPTIONS,
  type BookCategory,
} from "@/app/lib/book-catalog";
import type { BookClassification } from "@/app/lib/book-classifier";
import { getCanonicalBookTitle, isSameBookTitle } from "@/app/lib/known-books";
import {
  classifyBookTitle,
  getOwnedBooks,
  saveOwnedBooks,
  type OwnedBook,
} from "@/app/lib/owned-books-storage";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { CollapsibleSection } from "@/app/components/ui/CollapsibleSection";

type DraftBook = OwnedBook & { sourceNote?: string };

export function OwnedBooksSettings() {
  const [books, setBooks] = useState<DraftBook[]>([]);
  const [inputTitle, setInputTitle] = useState("");
  const [ready, setReady] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOwnedBooks()
      .then((loaded) => {
        setBooks(loaded);
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

  const handleAdd = async () => {
    const title = inputTitle.trim();
    if (!title) return;
    if (books.some((b) => isSameBookTitle(b.title, title))) {
      setError("同じ棋書がすでに登録されています（表記ゆれも同一扱い）");
      return;
    }

    setClassifying(true);
    setError(null);
    setSaved(false);
    try {
      const result: BookClassification = await classifyBookTitle(title);
      setBooks((prev) => [
        ...prev,
        {
          title: result.title,
          category: result.category,
          studyAction: result.studyAction,
          autoClassified: true,
          sourceNote: result.sourceNote,
        },
      ]);
      setInputTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "棋書の判別に失敗しました");
    } finally {
      setClassifying(false);
    }
  };

  const updateCategory = (index: number, category: BookCategory) => {
    setBooks((prev) =>
      prev.map((book, i) =>
        i === index ? { ...book, category, autoClassified: false } : book
      )
    );
    setSaved(false);
  };

  const removeBook = (index: number) => {
    setBooks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalizedBooks = books.map((book) => ({
        ...book,
        title: getCanonicalBookTitle(book.title),
      }));
      const savedBooks = await saveOwnedBooks(normalizedBooks);
      setBooks(savedBooks);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const grouped = BOOK_CATEGORY_OPTIONS.map((category) => ({
    category,
    items: books
      .map((book, index) => ({ book, index }))
      .filter(({ book }) => book.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <Card>
      <h2 className="text-sm font-semibold">購入済みの棋書</h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-sub)]">
        持っている棋書の名前を入力して追加してください。種類（詰将棋・寄せ・受けなど）は自動判別し、間違っていれば手動で修正できます。
      </p>

      {!ready ? (
        <p className="mt-4 text-sm text-[var(--color-text-sub)]">読み込み中...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--color-text)]">
              棋書のタイトル
            </label>
            <div className="flex gap-2">
              <input
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="例: 5手詰ハンドブック、寄せの手筋200"
                className="min-h-11 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <Button
                onClick={() => void handleAdd()}
                disabled={classifying || !inputTitle.trim()}
              >
                {classifying ? "判別中..." : "追加"}
              </Button>
            </div>
            <p className="text-xs text-[var(--color-text-sub)]">
              定番書は即座に判別。それ以外はWeb情報とAIで種類を推定します。
            </p>
          </div>

          {books.length === 0 ? (
            <p className="rounded-lg bg-[var(--color-bg-sub)] p-3 text-xs text-[var(--color-text-sub)]">
              まだ棋書が登録されていません。上の欄に書名を入力して「追加」をタップしてください。
            </p>
          ) : (
            <CollapsibleSection
              title={`登録済みの棋書（${books.length}冊）`}
              preview={grouped
                .map(
                  (g) =>
                    `${BOOK_CATEGORY_LABELS[g.category]} ${g.items.length}冊`
                )
                .join("、")}
            >
              <div className="flex flex-col gap-4">
                {grouped.map(({ category, items }) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-semibold text-[var(--color-primary)]">
                      {BOOK_CATEGORY_LABELS[category]}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {items.map(({ book, index }) => (
                        <li
                          key={`${book.title}-${index}`}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {book.title}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeBook(index)}
                              className="shrink-0 text-xs text-[var(--color-text-sub)] underline"
                            >
                              削除
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-[var(--color-text-sub)]">
                            {book.studyAction}
                          </p>
                          <label className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-[var(--color-text-sub)]">
                              種類:
                            </span>
                            <select
                              value={book.category}
                              onChange={(e) =>
                                updateCategory(
                                  index,
                                  e.target.value as BookCategory
                                )
                              }
                              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
                            >
                              {BOOK_CATEGORY_OPTIONS.map((cat) => (
                                <option key={cat} value={cat}>
                                  {BOOK_CATEGORY_LABELS[cat]}
                                </option>
                              ))}
                            </select>
                            {!book.autoClassified && (
                              <span className="text-[var(--color-primary)]">
                                手動修正済
                              </span>
                            )}
                          </label>
                          {book.sourceNote && book.autoClassified && (
                            <p className="mt-1 text-xs text-[var(--color-text-sub)]">
                              判別: {book.sourceNote}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-[var(--color-success)]">保存しました</p>
          )}

          <Button fullWidth onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "棋書の登録を保存"}
          </Button>
        </div>
      )}
    </Card>
  );
}
