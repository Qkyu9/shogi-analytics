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
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="shrink-0 text-sm text-[var(--color-text-sub)] hover:text-[var(--color-text)]"
            aria-label="戻る"
          >
            ←
          </Link>
        ) : (
          <span className="text-sm font-medium tracking-wide text-[var(--color-text)]">
            将棋 Analytics
          </span>
        )}
        {backHref && (
          <h1 className="truncate text-sm font-medium text-[var(--color-text)]">
            {title}
          </h1>
        )}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="shrink-0 text-sm text-[var(--color-text-sub)] hover:text-[var(--color-primary)]"
          aria-label={actionLabel}
        >
          {actionLabel}
        </Link>
      )}
    </header>
  );
}
