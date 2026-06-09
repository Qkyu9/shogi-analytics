import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { TagStylePreview } from "@/app/components/records/TagStylePreviewCard";

export default function TagPreviewPage() {
  return (
    <>
      <AppHeader title="タグ見た目の比較" backHref="/records" />
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        <section>
          <h1 className="text-base font-medium text-[var(--color-text)]">
            記録カードのタグ見た目（4パターン）
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-sub)]">
            日付横の「入力方法タグ」と、下の「弱点タグ」が混同しにくい組み合わせを選んでください。
            気に入ったパターンを A / B / C / D で教えてください。
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-sub)]">
            ※ このページは比較用です。本番の記録一覧にはまだ反映していません。
          </p>
          <Link
            href="/records"
            className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] underline"
          >
            記録一覧に戻る
          </Link>
        </section>

        <TagStylePreview />

        <p className="pb-8 text-center text-xs text-[var(--color-text-sub)]">
          選んだパターン（A〜D）をチャットで伝えてください
        </p>
      </main>
    </>
  );
}
