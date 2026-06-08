import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { Card } from "@/app/components/ui/Card";

export default function SettingsPage() {
  return (
    <>
      <AppHeader title="設定" backHref="/" />
      <main className="flex flex-col gap-4 px-4 py-6">
        <Card>
          <h2 className="text-sm font-semibold">ユーザー</h2>
          <p className="mt-2 text-sm text-[var(--color-text-sub)]">
            本人（デモモード）
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-sub)]">
            ※ 認証機能は次のフェーズで実装予定
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">1日の学習時間</h2>
          <p className="mt-2 text-2xl font-bold">60分</p>
          <p className="mt-1 text-xs text-[var(--color-text-sub)]">
            将来、ここから変更できるようにします
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">アカウント</h2>
          <Link
            href="/sign-in"
            className="mt-2 inline-block text-sm text-[var(--color-primary)]"
          >
            ログイン（プレースホルダ）
          </Link>
        </Card>

        <p className="text-center text-xs text-[var(--color-text-sub)]">
          将棋 Analytics v0.1（フロントエンドデモ）
        </p>
      </main>
    </>
  );
}
