import Link from "next/link";

export function AppHeader({
  title,
  backHref,
  actionHref,
  actionLabel = "設定",
}: {
  title: string;
  backHref?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="shrink-0 text-sm text-[var(--color-primary)]"
            aria-label="戻る"
          >
            ← 戻る
          </Link>
        ) : (
          <span className="text-lg font-bold">将棋 Analytics</span>
        )}
        {backHref && (
          <h1 className="truncate text-base font-semibold">{title}</h1>
        )}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 text-sm text-[var(--color-text-sub)]"
          aria-label={actionLabel}
        >
          {actionLabel === "設定" ? "⚙" : actionLabel}
        </Link>
      )}
    </header>
  );
}
