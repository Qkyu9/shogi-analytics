"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SourceInputCollapsible } from "@/app/components/records/SourceInputCollapsible";
import { Button } from "@/app/components/ui/Button";
import { TagChip } from "@/app/components/ui/TagChip";
import { deleteRecord, getRecordDetail } from "@/app/lib/record-storage";
import { PLAYER_SIDE_LABELS } from "@/app/lib/handicap";
import type { GameRecordDetail } from "@/app/lib/types";
import { formatDateTime, resultLabel } from "@/app/lib/utils";

export function RecordDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<GameRecordDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getRecordDetail(id)
      .then((detail) => {
        if (!detail) {
          router.replace("/records");
          return;
        }
        setRecord(detail);
        setReady(true);
      })
      .catch(() => router.replace("/records"));
  }, [id, router]);

  const handleDelete = async () => {
    if (!record) return;
    const played = formatDateTime(record.playedAt);
    const confirmed = window.confirm(
      `${played} の対局記録を削除します。\nこの操作は取り消せません。よろしいですか？`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteRecord(record.id);
      router.replace("/records");
    } catch {
      setDeleting(false);
      window.alert("削除に失敗しました。しばらくしてから再度お試しください。");
    }
  };

  if (!ready || !record) {
    return (
      <main className="px-4 py-8 text-center text-sm text-[var(--color-text-sub)]">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <section>
        <p className="text-sm text-[var(--color-text-sub)]">
          {formatDateTime(record.playedAt)}
        </p>
        <p className="mt-1 font-semibold">{resultLabel(record.result)}</p>
        <p className="mt-1 text-sm">{record.venueLabel}</p>
        {record.handicap.trim() && (
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">
            手合: {record.handicap}
            {record.playerSide
              ? `（${PLAYER_SIDE_LABELS[record.playerSide]}）`
              : ""}
          </p>
        )}
        <p className="mt-2">
          {record.myStrategy} vs {record.opponentStrategy || "（未入力）"}
        </p>
        {record.opponentRank.trim() && (
          <p className="mt-1 text-sm text-[var(--color-text-sub)]">
            相手の段位・級位: {record.opponentRank}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {record.tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      </section>

      {record.sourceInputText && (
        <SourceInputCollapsible text={record.sourceInputText} />
      )}

      {record.positions.map((pos, index) => (
        <section
          key={pos.sortOrder}
          className="rounded-xl bg-[var(--color-surface)] p-4"
        >
          <h2 className="text-sm font-semibold">局面 {index + 1}</h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">
                印象に残った局面
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.sceneDescription}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">敗因・疑問手</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.defeatCause}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">正着</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.correctMove}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-sub)]">教訓</dt>
              <dd className="mt-1 whitespace-pre-wrap">{pos.lesson}</dd>
            </div>
          </dl>
        </section>
      ))}

      {record.kifuText && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">棋譜</h2>
          <pre className="overflow-x-auto rounded-xl bg-[var(--color-bg-sub)] p-3 font-mono text-xs whitespace-pre-wrap">
            {record.kifuText}
          </pre>
        </section>
      )}

      <Link href={`/records/${record.id}/edit`} className="block">
        <Button fullWidth>この記録を編集</Button>
      </Link>

      <Link
        href="/records/new"
        className="text-center text-sm text-[var(--color-primary)]"
      >
        新しい記録を追加
      </Link>

      <Button
        variant="danger"
        fullWidth
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "削除中..." : "この記録を削除"}
      </Button>
    </main>
  );
}
