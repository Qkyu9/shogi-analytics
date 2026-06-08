import Link from "next/link";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export default function SignInPage() {
  return (
    <>
      <AppHeader title="ログイン" backHref="/settings" />
      <main className="flex flex-col gap-6 px-4 py-8">
        <Card>
          <p className="text-sm leading-relaxed text-[var(--color-text-sub)]">
            ログイン機能は次のフェーズで実装します（Clerk 連携予定）。
            現在はデモモードで動作しています。
          </p>
        </Card>

        <Button fullWidth disabled>
          ログイン（準備中）
        </Button>

        <Link
          href="/"
          className="text-center text-sm text-[var(--color-primary)]"
        >
          ホームに戻る
        </Link>
      </main>
    </>
  );
}
