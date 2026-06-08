"use client";

import { useState } from "react";
import { TagChip } from "@/app/components/ui/TagChip";

export function TagInput({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput("");
  };

  const unusedSuggestions = (suggestions ?? []).filter((s) => !tags.includes(s));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            onRemove={() => onChange(tags.filter((t) => t !== tag))}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder="タグを追加"
          className="min-h-12 flex-1 rounded-lg border border-[var(--color-border)] px-3 text-base"
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          className="rounded-lg border border-[var(--color-border)] px-4 text-sm"
        >
          追加
        </button>
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full bg-[var(--color-bg-sub)] px-3 py-1 text-xs text-[var(--color-text-sub)]"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
