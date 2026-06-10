import Link from "next/link";
import { HomeLessonHeadline } from "@/app/components/home/HomeLessonHeadline";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordsView } from "@/app/components/records/RecordsView";
import { FeaturePhotoCard } from "@/app/components/ui/FeaturePhotoCard";

export default function HomePage() {
  return (
    <>
      <AppHeader title="ホーム" actionHref="/settings" />
      <main className="flex flex-col gap-8 px-4 py-6">
        <HomeLessonHeadline />

        <section className="grid grid-cols-2 gap-3">
          <Link href="/analysis">
            <FeaturePhotoCard title="弱点分析" variant="analysis" />
          </Link>
          <Link href="/study-menu">
            <FeaturePhotoCard title="学習メニュー" variant="study" />
          </Link>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-text)]">
              最近の記録
            </h2>
            <Link
              href="/records"
              className="text-xs text-[var(--color-primary)]"
            >
              すべて見る
            </Link>
          </div>
          <RecordsView limit={3} />
        </section>
      </main>
    </>
  );
}
