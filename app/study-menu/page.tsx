import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { StudyMenuView } from "@/app/components/analysis/StudyMenuView";
import { Button } from "@/app/components/ui/Button";

export default function StudyMenuPage() {
  return (
    <>
      <AppHeader title="学習メニュー" backHref="/" />
      <main className="flex flex-col gap-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
          弱点分析に基づき、限られた時間の中で何に取り組むかを提案します。
        </p>
        <StudyMenuView />
        <Link href="/analysis" className="block">
          <Button variant="secondary" fullWidth>
            弱点分析を見る
          </Button>
        </Link>
      </main>
    </>
  );
}
