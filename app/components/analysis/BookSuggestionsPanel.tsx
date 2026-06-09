import { buildAmazonUrl } from "@/app/lib/known-books";
import type { BookSuggestion } from "@/app/lib/study-recommendations";

function BookList({
  title,
  items,
  variant,
}: {
  title: string;
  items: BookSuggestion[];
  variant: "owned" | "purchase";
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.bookId}
            className={`rounded-xl p-4 ${
              variant === "purchase"
                ? "border border-dashed border-[var(--color-primary)] bg-[var(--color-bg-sub)]"
                : "bg-[var(--color-surface)]"
            }`}
          >
            <p className="text-sm font-medium text-[var(--color-text)]">
              {item.title}
              {variant === "purchase" && (
                <span className="ml-2 text-xs font-normal text-[var(--color-primary)]">
                  購入・学習を推薦
                </span>
              )}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--color-primary)]">
              {item.studyAction}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-sub)]">
              {item.reason}
            </p>
            {variant === "purchase" && (
              <a
                href={buildAmazonUrl(item.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-[var(--color-primary)] underline"
              >
                Amazonで探す
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BookSuggestionsPanel({
  ownedBookPicks,
  purchaseSuggestions,
}: {
  ownedBookPicks: BookSuggestion[];
  purchaseSuggestions: BookSuggestion[];
}) {
  if (ownedBookPicks.length === 0 && purchaseSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <BookList
        title="手持ちの棋書から優先"
        items={ownedBookPicks}
        variant="owned"
      />
      <BookList
        title="弱点克服のための購入・学習推薦"
        items={purchaseSuggestions}
        variant="purchase"
      />
    </div>
  );
}
