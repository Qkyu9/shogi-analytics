import { AppHeader } from "@/app/components/layout/AppHeader";
import { AnalysisView } from "@/app/components/analysis/AnalysisView";

export default function AnalysisPage() {
  return (
    <>
      <AppHeader title="弱点分析" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
          敗因タグの傾向に加え、自分・相手の戦型の採用回数と勝率を確認できます。勝ち局も記録すると戦型の傾向がより正確になります。
        </p>
        <AnalysisView />
      </main>
    </>
  );
}
