import Link from "next/link";
import { HomeWeaknessCard } from "@/app/components/home/HomeWeaknessCard";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordsView } from "@/app/components/records/RecordsView";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export default function HomePage() {
  return (
    <>
      <AppHeader title="ホーム" actionHref="/settings" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <section>
          <Link href="/records/new" className="block">
            <Button fullWidth>対局を記録する</Button>
          </Link>
        </section>

        <HomeWeaknessCard />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">最近の記録</h2>
            <Link
              href="/records"
              className="text-sm text-[var(--color-primary)]"
            >
              すべて見る
            </Link>
          </div>
          <RecordsView limit={3} />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link href="/analysis">
            <Card className="text-center">
              <span className="text-2xl" aria-hidden>
                📊
              </span>
              <p className="mt-1 text-sm font-semibold">弱点分析</p>
            </Card>
          </Link>
          <Link href="/study-menu">
            <Card className="text-center">
              <span className="text-2xl" aria-hidden>
                📚
              </span>
              <p className="mt-1 text-sm font-semibold">学習メニュー</p>
            </Card>
          </Link>
        </section>
      </main>
    </>
  );
}
