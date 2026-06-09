"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearDraft } from "@/app/lib/draft-storage";
import { clearTranscriptCache } from "@/app/lib/transcript-cache";
import { saveRecord, updateRecord } from "@/app/lib/record-storage";
import { Button } from "@/app/components/ui/Button";
import { generateKishinInsight } from "@/app/lib/kishin-insight-client";
import { FieldVoiceInput } from "./FieldVoiceInput";
import { KifuPasteArea } from "./KifuPasteArea";
import { SourceInputCollapsible } from "./SourceInputCollapsible";
import { TagInput } from "./TagInput";
import {
  PLAYER_SIDE_LABELS,
  resolveHandicapFields,
} from "@/app/lib/handicap";
import type { GameRecordDraft, GamePosition } from "@/app/lib/types";
import { VENUE_OPTIONS } from "@/app/lib/types";
import { fromDatetimeLocalJst, toDatetimeLocalJst } from "@/app/lib/utils";
import { mockTagSuggestions } from "@/app/lib/mock-data";

const emptyPosition = (): GamePosition => ({
  sceneDescription: "",
  defeatCause: "",
  correctMove: "",
  lesson: "",
});

const FIELD_HINTS: Partial<Record<keyof GamePosition, string>> = {
  sceneDescription: "盤面の状況・相手の狙い・流れを書く",
  defeatCause: "敗因・疑問手（短文・常体）",
  correctMove: "正しい手と、なぜ正着かの理由を書く",
  lesson: "次回意識すべき判断基準",
};

const FIELD_ROWS: Partial<Record<keyof GamePosition, number>> = {
  sceneDescription: 4,
  defeatCause: 4,
  correctMove: 4,
  lesson: 3,
};

export function RecordPreviewForm({
  mode = "create",
  recordId,
  initialData,
  sourceInputText,
  onDiscard,
}: {
  mode?: "create" | "edit";
  recordId?: string;
  initialData: GameRecordDraft;
  sourceInputText?: string;
  onDiscard?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<GameRecordDraft>({
    ...initialData,
    opponentRank: initialData.opponentRank ?? "",
    handicap: initialData.handicap ?? "",
    playerSide: initialData.playerSide ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingKishin, setGeneratingKishin] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const resolvedSourceInput =
    sourceInputText?.trim() ||
    draft.sourceInputText?.trim() ||
    "";

  const updatePosition = (index: number, field: keyof GamePosition, value: string) => {
    setDraft((d) => ({
      ...d,
      positions: d.positions.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const addPosition = () => {
    setDraft((d) => ({
      ...d,
      positions: [...d.positions, emptyPosition()],
    }));
  };

  const removePosition = (index: number) => {
    setDraft((d) => ({
      ...d,
      positions: d.positions.filter((_, i) => i !== index),
    }));
  };

  const updateHandicap = (value: string) => {
    const resolved = resolveHandicapFields(value, draft.playerSide);
    setDraft((d) => ({
      ...d,
      handicap: resolved.handicap,
      playerSide: resolved.playerSide,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const resolved = resolveHandicapFields(draft.handicap, draft.playerSide);
      let kishinInsight = draft.kishinInsight;
      const kifuText = draft.kifuText?.trim() ?? "";

      const kifuChanged =
        kifuText !== (initialData.kifuText?.trim() ?? "");
      const contextChanged =
        resolved.playerSide !== (initialData.playerSide ?? null) ||
        draft.result !== initialData.result;
      const shouldGenerateKishin =
        Boolean(kifuText) &&
        (mode === "create" ||
          kifuChanged ||
          contextChanged ||
          !initialData.kishinInsight);

      if (shouldGenerateKishin) {
        setGeneratingKishin(true);
        setSaveStatus("棋神からの示唆を生成しています…");
        try {
          kishinInsight = await generateKishinInsight(kifuText, {
            playerSide: resolved.playerSide,
            result: draft.result,
          });
        } catch {
          // 生成失敗時は既存の示唆を維持（口頭要約は保存を続行）
          kishinInsight = initialData.kishinInsight ?? draft.kishinInsight;
          setSaveStatus(
            "棋神からの示唆の生成に失敗しました。口頭要約のみ保存します。"
          );
        } finally {
          setGeneratingKishin(false);
        }
      } else if (!kifuText) {
        kishinInsight = undefined;
      } else {
        // 棋譜変更なし → 保存済みの示唆をそのまま使う
        kishinInsight = initialData.kishinInsight ?? draft.kishinInsight;
      }

      const payload: GameRecordDraft = {
        ...draft,
        handicap: resolved.handicap,
        playerSide: resolved.playerSide,
        sourceInputText: resolvedSourceInput || draft.sourceInputText,
        kishinInsight,
      };

      if (mode === "edit" && recordId) {
        await updateRecord(recordId, payload);
        setSaved(true);
        router.push("/records");
        return;
      }

      await saveRecord(payload);
      clearDraft();
      clearTranscriptCache();
      setSaved(true);
      router.push("/records");
    } catch {
      setSaving(false);
      setSaveStatus(null);
    }
  };

  const handleDiscard = () => {
    if (mode === "create") clearDraft();
    if (onDiscard) onDiscard();
    else if (mode === "edit" && recordId) router.push(`/records/${recordId}`);
    else router.push("/");
  };

  const saveLabel = generatingKishin
    ? "棋神示唆を生成中..."
    : saving
      ? "保存中..."
      : mode === "edit"
        ? "変更を保存"
        : "保存する";

  const actionButtons = (
    <>
      <Button variant="secondary" onClick={handleDiscard}>
        {mode === "edit" ? "キャンセル" : "破棄"}
      </Button>
      <Button fullWidth onClick={handleSave} disabled={saving || generatingKishin}>
        {saveLabel}
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-6 px-4 pb-4 pt-4">
      {saved && (
        <div className="rounded-lg bg-[var(--color-surface)] p-3 text-sm text-[var(--color-success)]">
          保存しました
        </div>
      )}

      {saveStatus && (
        <div className="rounded-lg bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-sub)]">
          {saveStatus}
        </div>
      )}

      {resolvedSourceInput && (
        <SourceInputCollapsible text={resolvedSourceInput} />
      )}

      <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
        {mode === "edit"
          ? "保存済みの記録を編集できます。各欄のマイクで音声入力もできます。棋譜を変更して保存すると、棋神からの示唆も自動で更新されます。"
          : "AIが要約した内容です。タイピングまたは各欄のマイクで修正して保存できます。棋譜を貼り付けて保存すると、棋神からの示唆も自動で記録に残ります。"}
      </p>

      <section className="flex flex-col gap-3">
        <label className="text-sm font-semibold">対局日時</label>
        <input
          type="datetime-local"
          value={toDatetimeLocalJst(draft.playedAt)}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              playedAt: fromDatetimeLocalJst(e.target.value),
            }))
          }
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        />

        <label className="text-sm font-semibold">対局形式</label>
        <select
          value={draft.venueType}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              venueType: e.target.value as GameRecordDraft["venueType"],
            }))
          }
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        >
          {VENUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="text-sm font-semibold">手合</label>
        <input
          placeholder="例: 香落ち下手、後手、平手、角落ち上手"
          value={draft.handicap}
          onChange={(e) => updateHandicap(e.target.value)}
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        />
        {draft.playerSide && (
          <p className="text-xs text-[var(--color-text-sub)]">
            自分の手番: {PLAYER_SIDE_LABELS[draft.playerSide]}
            （駒落ちでは上手が先手になります）
          </p>
        )}

        <label className="text-sm font-semibold">結果</label>
        <select
          value={draft.result}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              result: e.target.value as GameRecordDraft["result"],
            }))
          }
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        >
          <option value="loss">負け</option>
          <option value="win">勝ち</option>
          <option value="draw">引き分け</option>
        </select>
      </section>

      <section className="flex flex-col gap-3">
        <label className="text-sm font-semibold">相手の段位・級位</label>
        <input
          placeholder="例: 会館初段、ウォーズ初段"
          value={draft.opponentRank ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, opponentRank: e.target.value }))
          }
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">戦型</h2>
        <input
          placeholder="自分の戦型（例: 雁木右玉）"
          value={draft.myStrategy}
          onChange={(e) => setDraft((d) => ({ ...d, myStrategy: e.target.value }))}
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        />
        <input
          placeholder="相手の戦型（例: 持久戦矢倉）"
          value={draft.opponentStrategy}
          onChange={(e) =>
            setDraft((d) => ({ ...d, opponentStrategy: e.target.value }))
          }
          className="min-h-12 rounded-lg border border-[var(--color-border)] px-3"
        />
      </section>

      {draft.positions.map((pos, index) => (
        <section
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">局面 {index + 1}</h2>
            {draft.positions.length > 1 && (
              <button
                type="button"
                onClick={() => removePosition(index)}
                className="text-xs text-[var(--color-danger)]"
              >
                削除
              </button>
            )}
          </div>
          {(
            [
              ["sceneDescription", "印象に残った局面"],
              ["defeatCause", "敗因・疑問手"],
              ["correctMove", "正着"],
              ["lesson", "教訓"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-[var(--color-text-sub)]">
                {label}
                {FIELD_HINTS[field] && (
                  <span className="ml-1 text-[var(--color-text-sub)]">
                    — {FIELD_HINTS[field]}
                  </span>
                )}
              </label>
              <FieldVoiceInput
                value={pos[field]}
                onChange={(v) => updatePosition(index, field, v)}
                rows={FIELD_ROWS[field] ?? 3}
                className="mt-1"
              />
            </div>
          ))}
        </section>
      ))}

      <Button variant="secondary" onClick={addPosition}>
        ＋ 局面を追加
      </Button>

      <section>
        <h2 className="mb-2 text-sm font-semibold">敗因タグ</h2>
        <TagInput
          tags={draft.tags}
          suggestions={mockTagSuggestions}
          onChange={(tags) => setDraft((d) => ({ ...d, tags }))}
        />
      </section>

      <KifuPasteArea
        value={draft.kifuText ?? ""}
        onChange={(kifuText) => setDraft((d) => ({ ...d, kifuText }))}
      />

      <div className="flex gap-3 border-t border-[var(--color-border)] pt-4">
        {actionButtons}
      </div>
    </div>
  );
}
