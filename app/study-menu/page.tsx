import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { StudyMenuCard } from "@/app/components/analysis/StudyMenuCard";
import { Button } from "@/app/components/ui/Button";
import { mockStudyMenu } from "@/app/lib/mock-data";

const DAILY_STUDY_MINUTES = 60;

export default function StudyMenuPage() {
  const totalPercent = mockStudyMenu.reduce((sum, a) => sum + a.percentage, 0);

  return (
    <>
      <AppHeader title="学習メニュー" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
          弱点分析に基づき、限られた時間の中で何に取り組むかを提案します。
        </p>

        <StudyMenuCard
          allocations={mockStudyMenu}
          dailyStudyMinutes={DAILY_STUDY_MINUTES}
        />

        <p className="text-center text-xs text-[var(--color-text-sub)]">
          配分合計: {totalPercent}%
        </p>

        <Link href="/analysis" className="block">
          <Button variant="secondary" fullWidth>
            弱点分析を見る
          </Button>
        </Link>
      </main>
    </>
  );
}
