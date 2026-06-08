"use client";

import { useState } from "react";

export function KifuPasteArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const [open, setOpen] = useState(!!value);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-[var(--color-border)] py-3 text-sm text-[var(--color-primary)]"
      >
        棋譜を貼り付ける（任意）
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">棋譜（棋神アナリティクスからコピー）</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="棋神アナリティクスからコピーした棋譜を貼り付け"
        className="w-full rounded-lg border border-[var(--color-border)] p-3 font-mono text-sm"
      />
    </div>
  );
}
