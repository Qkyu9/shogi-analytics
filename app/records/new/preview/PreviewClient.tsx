"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordPreviewForm } from "@/app/components/records/RecordPreviewForm";
import { loadDraft } from "@/app/lib/draft-storage";
import type { GameRecordDraft } from "@/app/lib/types";

export function PreviewClient() {
  const router = useRouter();
  const [draft, setDraft] = useState<GameRecordDraft | null>(null);
  const [sourceInputText, setSourceInputText] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadDraft();
    if (!stored?.draft) {
      router.replace("/records/new");
      return;
    }
    setDraft({
      ...stored.draft,
      opponentRank: stored.draft.opponentRank ?? "",
    });
    setSourceInputText(
      stored.sourceInputText ?? stored.rawTranscript ?? stored.transcript
    );
    setReady(true);
  }, [router]);

  if (!ready || !draft) {
    return (
      <>
        <AppHeader title="要約の確認" backHref="/records/new" />
        <main className="px-4 py-8 text-center text-sm text-[var(--color-text-sub)]">
          読み込み中...
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader title="要約の確認" backHref="/records/new" />
      <main>
        <RecordPreviewForm
          initialData={draft}
          sourceInputText={sourceInputText}
          onDiscard={() => router.push("/records/new")}
        />
      </main>
    </>
  );
}
