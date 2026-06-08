import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { Card } from "@/app/components/ui/Card";

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="設定" backHref="/" />
      <main className="flex flex-col gap-4 px-4 py-6">
        <Card>
          <h2 className="text-sm font-semibold">アカウント</h2>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-sub)]">
              ログイン中のアカウント
            </p>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">1日の学習時間</h2>
          <p className="mt-2 text-2xl font-bold">60分</p>
          <p className="mt-1 text-xs text-[var(--color-text-sub)]">
            将来、ここから変更できるようにします
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">UIカラーの候補</h2>
          <p className="mt-2 text-sm text-[var(--color-text-sub)]">
            温かみのあるトーン3パターンを比較できます。
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--color-primary)]">
            <Link href="/theme-preview">アプリ内で比較 →</Link>
            <Link href="/theme-previews/index.html">HTMLで比較（A/B/C） →</Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">データの保存先</h2>
          <p className="mt-2 text-sm text-[var(--color-text-sub)]">
            対局記録は Supabase（クラウド）に保存されます。ログインした端末から同じ記録にアクセスできます。
          </p>
        </Card>

        <p className="text-center text-xs text-[var(--color-text-sub)]">
          将棋 Analytics v0.2
        </p>
      </main>
    </>
  );
}
