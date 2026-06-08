import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { WeaknessRanking } from "@/app/components/analysis/WeaknessRanking";
import { Button } from "@/app/components/ui/Button";
import { mockRecords, mockWeaknessRanking } from "@/app/lib/mock-data";

export default function AnalysisPage() {
  const totalRecords = mockRecords.length;
  const lowDataWarning = totalRecords < 10;

  return (
    <>
      <AppHeader title="弱点分析" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
          敗因タグの出現回数から、いま重点的に克服すべき弱点を把握します。
        </p>

        <WeaknessRanking
          stats={mockWeaknessRanking}
          totalRecords={totalRecords}
          lowDataWarning={lowDataWarning}
        />

        <Link href="/study-menu" className="block">
          <Button fullWidth>学習メニューを見る</Button>
        </Link>
      </main>
    </>
  );
}
