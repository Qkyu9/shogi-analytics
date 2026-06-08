export function TagChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-tag-bg)] px-3 py-1 text-sm text-[var(--color-tag-text)]">
      #{label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label}を削除`}
          className="ml-1 min-h-8 min-w-8 rounded-full text-base leading-none hover:bg-white/60"
        >
          ×
        </button>
      )}
    </span>
  );
}
