"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { RecordPreviewForm } from "@/app/components/records/RecordPreviewForm";
import { detailToDraft } from "@/app/lib/record-draft";
import { getRecordDetail } from "@/app/lib/record-storage";
import type { GameRecordDraft } from "@/app/lib/types";

export function RecordEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GameRecordDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getRecordDetail(id)
      .then((record) => {
        if (!record) {
          router.replace("/records");
          return;
        }
        setDraft(detailToDraft(record));
        setReady(true);
      })
      .catch(() => router.replace("/records"));
  }, [id, router]);

  if (!ready || !draft) {
    return (
      <>
        <AppHeader title="記録を編集" backHref={`/records/${id}`} />
        <main className="px-4 py-8 text-center text-sm text-[var(--color-text-sub)]">
          読み込み中...
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader title="記録を編集" backHref={`/records/${id}`} />
      <main>
        <RecordPreviewForm
          mode="edit"
          recordId={id}
          initialData={draft}
          sourceInputText={draft.sourceInputText}
          onDiscard={() => router.push(`/records/${id}`)}
        />
      </main>
    </>
  );
}
