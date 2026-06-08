import { NextRequest, NextResponse } from "next/server";
import {
  CORRECT_TRANSCRIPT_SYSTEM,
  CORRECT_TRANSCRIPT_USER,
} from "@/app/lib/prompts/correct-transcript";
import { applyDictionaryCorrections } from "@/app/lib/shogi-term-corrections";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません。" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { transcript?: string };
    const raw = body.transcript?.trim();

    if (!raw) {
      return NextResponse.json(
        { error: "補正するテキストが空です。" },
        { status: 400 }
      );
    }

    const model = process.env.CORRECT_TRANSCRIPT_MODEL ?? "gpt-4o";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: CORRECT_TRANSCRIPT_SYSTEM },
          { role: "user", content: CORRECT_TRANSCRIPT_USER(raw) },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("correct-transcript error:", detail);
      // LLM失敗時は辞書のみ適用して返す
      const fallback = applyDictionaryCorrections(raw);
      return NextResponse.json({
        text: fallback,
        rawText: raw,
        correctedBy: "dictionary-fallback",
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const llmText = data.choices?.[0]?.message?.content?.trim();
    const text = applyDictionaryCorrections(llmText || raw);

    return NextResponse.json({
      text,
      rawText: raw,
      correctedBy: "llm",
    });
  } catch (error) {
    console.error("correct-transcript:", error);
    return NextResponse.json(
      { error: "将棋用語の補正中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
