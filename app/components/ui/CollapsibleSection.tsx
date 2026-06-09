"use client";

import { useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  preview?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  preview,
  defaultOpen = false,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-sub)] p-3 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--color-text)]"
      >
        <span>{title}</span>
        <span className="text-xs font-normal text-[var(--color-text-sub)]">
          {open ? "閉じる" : "開く"}
        </span>
      </button>
      {!open && preview && (
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">{preview}</p>
      )}
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
