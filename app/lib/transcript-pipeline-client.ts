import { saveDraft } from "@/app/lib/draft-storage";
import { parseJsonResponse } from "@/app/lib/ios-audio";
import { correctShogiTranscript } from "@/app/lib/transcribe-client";
import { saveTranscriptCache } from "@/app/lib/transcript-cache";
import type { GameRecordDraft } from "@/app/lib/types";

export type TranscriptPipelineStep = "correcting" | "summarizing";

export type TranscriptPipelineResult = {
  draft: GameRecordDraft;
  transcript: string;
  rawTranscript: string;
};

export async function runTranscriptPipeline(
  sourceText: string,
  onStep?: (step: TranscriptPipelineStep) => void
): Promise<TranscriptPipelineResult> {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    throw new Error("テキストを入力してください。");
  }

  onStep?.("correcting");

  const { corrected, rawText: raw } = await correctShogiTranscript(trimmed);

  onStep?.("summarizing");

  const summarizeRes = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: corrected }),
  });

  const summarizeData = await parseJsonResponse<{
    draft?: GameRecordDraft;
    transcript?: string;
    error?: string;
  }>(summarizeRes);

  if (!summarizeRes.ok) {
    throw new Error(summarizeData.error ?? "要約の生成に失敗しました。");
  }

  if (!summarizeData.draft) {
    throw new Error("要約データを取得できませんでした。");
  }

  const finalTranscript = summarizeData.transcript ?? corrected;

  saveTranscriptCache({
    transcript: finalTranscript,
    rawTranscript: raw,
    liveRawTranscript: trimmed,
    draft: summarizeData.draft,
    isNewTranscript: true,
  });

  saveDraft({
    draft: {
      ...summarizeData.draft,
      sourceInputText: trimmed,
    },
    transcript: finalTranscript,
    rawTranscript: raw,
    sourceInputText: trimmed,
  });

  return {
    draft: summarizeData.draft,
    transcript: finalTranscript,
    rawTranscript: raw,
  };
}
