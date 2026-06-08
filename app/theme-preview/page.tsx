import { AppHeader } from "@/app/components/layout/AppHeader";
import { ThemePreviewPanel } from "@/app/components/theme/ThemePreviewPanel";
import { THEME_PRESETS } from "@/app/lib/theme-presets";

export default function ThemePreviewPage() {
  return (
    <>
      <AppHeader title="テーマ候補" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <section>
          <h1 className="text-base font-medium text-[var(--color-text)]">
            UIカラーの候補（3パターン）
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-sub)]">
            分析・学習のアイコンはそのまま活かし、画面全体を温かみのあるトーンにする案です。
            気に入ったパターンを教えてください（A / B / C）。
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-sub)]">
            ※ 現在の本番画面はまだダークトーンのままです。このページだけ比較用です。
          </p>
        </section>

        <div className="flex flex-col gap-8">
          {THEME_PRESETS.map((preset) => (
            <ThemePreviewPanel key={preset.id} preset={preset} />
          ))}
        </div>
      </main>
    </>
  );
}
