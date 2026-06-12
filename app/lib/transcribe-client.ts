import {
  audioBlobExtension,
  buildUploadChunks,
  parseJsonResponse,
} from "@/app/lib/ios-audio";

/**
 * 文字起こし・将棋用語補正のAPI呼び出しをまとめた共通クライアント。
 * VoiceRecorder（メイン録音）・FieldVoiceInput（項目ごとのマイク）・
 * transcript-pipeline-client（テキスト貼り付け）から共通で使う。
 * API仕様やエラーメッセージを変えるときはこのファイルだけ直せばよい。
 */

/** 音声チャンク1つを文字起こしする */
export async function transcribeChunk(
  chunk: Blob,
  fileLabel = "recording"
): Promise<string> {
  const ext = audioBlobExtension(chunk);
  const form = new FormData();
  form.append("audio", chunk, `${fileLabel}.${ext}`);

  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  const data = await parseJsonResponse<{ text?: string; error?: string }>(res);

  if (!res.ok) {
    throw new Error(data.error ?? "文字起こしに失敗しました。");
  }

  return data.text?.trim() ?? "";
}

/** 録音Blob全体を（必要ならチャンク分割して）文字起こしする */
export async function transcribeBlobToText(
  blob: Blob,
  fileLabel = "recording"
): Promise<string> {
  if (blob.size === 0) return "";

  const chunks = await buildUploadChunks(blob);
  const parts: string[] = [];

  for (const chunk of chunks) {
    const text = await transcribeChunk(chunk, fileLabel);
    if (text) parts.push(text);
  }

  return parts.join("\n").trim();
}

/** 文字起こしテキストを将棋用語として補正する */
export async function correctShogiTranscript(
  raw: string
): Promise<{ corrected: string; rawText: string }> {
  const res = await fetch("/api/correct-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: raw }),
  });

  const data = await parseJsonResponse<{
    text?: string;
    rawText?: string;
    error?: string;
  }>(res);

  if (!res.ok) {
    throw new Error(data.error ?? "将棋用語の補正に失敗しました。");
  }

  return {
    corrected: data.text?.trim() || raw,
    rawText: data.rawText ?? raw,
  };
}
