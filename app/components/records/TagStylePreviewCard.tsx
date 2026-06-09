import { TagChip } from "@/app/components/ui/TagChip";

type TagStyleVariant = "a" | "b" | "c" | "d";

const SAMPLE = {
  date: "6/9",
  result: "負け",
  title: "対振り右玉 vs 四間飛車（ウォーズ二段）",
  venue: "将棋ウォーズ 10切れ",
  insightTags: ["攻めの手順選択", "中盤の読み（攻めるか受けるか）"],
};

function InputTagA({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-sub)]">
      #{label}
    </span>
  );
}

function InputTagB({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-sub)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-sub)]">
      {label}
    </span>
  );
}

function InputTagC({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-sub)]">
      {label}
    </span>
  );
}

function WeaknessTagB({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--color-primary)]/30 bg-[var(--color-tag-bg)] px-2 py-0.5 text-xs text-[var(--color-tag-text)]">
      {label}
    </span>
  );
}

function WeaknessTagD({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--color-primary)]/30 bg-[var(--color-tag-bg)] px-2 py-0.5 text-xs text-[var(--color-tag-text)]">
      {label}
    </span>
  );
}

const VARIANT_META: Record<
  TagStyleVariant,
  { title: string; description: string; recommended?: boolean }
> = {
  a: {
    title: "A. 現在の実装",
    description: "入力方法＝#＋角丸四角枠／弱点タグ＝丸いピル",
  },
  b: {
    title: "B. 逆パターン",
    description: "入力方法＝丸いピル／弱点タグ＝角丸四角枠",
  },
  c: {
    title: "C. #なし（四角枠のみ）",
    description: "入力方法＝角丸四角枠（#なし）／弱点タグ＝丸いピル",
    recommended: true,
  },
  d: {
    title: "D. 逆＋#なし",
    description: "入力方法＝丸いピル／弱点タグ＝角丸四角枠（#なし）",
  },
};

function PreviewCard({ variant }: { variant: TagStyleVariant }) {
  const meta = VARIANT_META[variant];

  const inputTags = (
    <>
      {(variant === "a" || variant === "c") && (
        <>
          {variant === "a" ? (
            <>
              <InputTagA label="音声入力" />
              <InputTagA label="棋譜データ" />
            </>
          ) : (
            <>
              <InputTagC label="音声入力" />
              <InputTagC label="棋譜データ" />
            </>
          )}
        </>
      )}
      {(variant === "b" || variant === "d") && (
        <>
          <InputTagB label="音声入力" />
          <InputTagB label="棋譜データ" />
        </>
      )}
    </>
  );

  const weaknessTags = (
    <div className="mt-2 flex flex-wrap gap-1">
      {SAMPLE.insightTags.map((tag) =>
        variant === "b" || variant === "d" ? (
          variant === "b" ? (
            <WeaknessTagB key={tag} label={tag} />
          ) : (
            <WeaknessTagD key={tag} label={tag} />
          )
        ) : (
          <TagChip key={tag} label={tag} />
        )
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          {meta.title}
          {meta.recommended && (
            <span className="ml-2 text-xs font-normal text-[var(--color-primary)]">
              おすすめ候補
            </span>
          )}
        </h3>
        <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
          {meta.description}
        </p>
      </div>
      <article className="rounded-xl bg-[var(--color-surface)] p-4 shadow-sm ring-1 ring-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-xs text-[var(--color-text-sub)]">
              {SAMPLE.date}
            </span>
            {inputTags}
          </div>
          <span className="shrink-0 text-sm text-[var(--color-text)]">
            {SAMPLE.result}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--color-text)]">{SAMPLE.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
          {SAMPLE.venue}
        </p>
        {weaknessTags}
      </article>
    </section>
  );
}

export function TagStylePreview() {
  return (
    <div className="flex flex-col gap-8">
      {(["a", "b", "c", "d"] as TagStyleVariant[]).map((variant) => (
        <PreviewCard key={variant} variant={variant} />
      ))}
    </div>
  );
}
