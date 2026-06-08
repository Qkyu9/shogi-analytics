import { AppHeader } from "@/app/components/layout/AppHeader";
import { AnalysisView } from "@/app/components/analysis/AnalysisView";

export default function AnalysisPage() {
  return (
    <>
      <AppHeader title="弱点分析" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
          敗因タグの出現回数から、いま重点的に克服すべき弱点を把握します。
        </p>
        <AnalysisView />
      </main>
    </>
  );
}
