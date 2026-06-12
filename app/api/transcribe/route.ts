import { NextRequest, NextResponse } from "next/server";
import { buildTranscribeHint } from "@/app/lib/shogi-vocabulary";

export const maxDuration = 60; // Vercel サーバーレス関数のタイムアウトを60秒に延長

const MAX_BYTES = 25 * 1024 * 1024; // 25MB（OpenAI上限に合わせる）

const TRANSCRIBE_MODELS = [
  process.env.TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
  process.env.TRANSCRIBE_MODEL_FALLBACK ?? "whisper-1",
];

async function transcribeWithModel(
  apiKey: string,
  audio: Blob,
  ext: string,
  model: string
): Promise<Response> {
  const form = new FormData();
  form.append("file", audio, `recording.${ext}`);
  form.append("model", model);
  form.append("language", "ja");
  // 将棋用語の事前ヒント（誤認識の予防）
  form.append("prompt", buildTranscribeHint());

  return fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY が設定されていません。demo-implementation/.env.local にキーを追加してください。",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "音声データが見つかりません。" },
        { status: 400 }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { error: "録音データが空です。もう一度録音してください。" },
        { status: 400 }
      );
    }

    if (audio.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "音声ファイルが大きすぎます（最大25MB）。" },
        { status: 400 }
      );
    }

    // type が空の場合（iOS Safari）は m4a をデフォルトにする
    const type = (audio.type || "").toLowerCase();
    const ext = type.includes("wav")
      ? "wav"
      : type.includes("mp4") || type.includes("m4a") || type === ""
        ? "m4a"
        : type.includes("webm")
          ? "webm"
          : type.includes("ogg")
            ? "ogg"
            : "m4a";

    let lastError = "";
    for (const model of TRANSCRIBE_MODELS) {
      const response = await transcribeWithModel(apiKey, audio, ext, model);

      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        return NextResponse.json({
          text: data.text ?? "",
          model,
        });
      }

      lastError = await response.text();
      console.error(`Transcribe failed (${model}):`, lastError);
    }

    return NextResponse.json(
      { error: "音声の文字起こしに失敗しました。もう一度お試しください。" },
      { status: 502 }
    );
  } catch (error) {
    console.error("transcribe error:", error);
    return NextResponse.json(
      { error: "音声処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
