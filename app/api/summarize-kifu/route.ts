import { NextRequest, NextResponse } from "next/server";
import type { PlayerSide } from "@/app/lib/handicap";
import type { KifuAnalysisContext } from "@/app/lib/kifu-player-context";
import { trimKifuForAnalysis } from "@/app/lib/kifu-text-trim";
import {
  KISHIN_INSIGHT_FORMAT_VERSION,
  SUMMARIZE_KIFU_SYSTEM_PROMPT,
  SUMMARIZE_KIFU_USER_PROMPT,
} from "@/app/lib/prompts/summarize-kifu";
import type { GameResult, KishinInsight, KishinTurningPoint } from "@/app/lib/types";

type SummarizeKifuRequest = {
  kifuText: string;
  playerSide?: PlayerSide | null;
  result?: GameResult | null;
};

type RawKishinInsight = {
  briefSummaries?: string[];
  turningPoints?: Array<Partial<KishinTurningPoint>>;
};

function extractJson(text: string): RawKishinInsight {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as RawKishinInsight;
}

function normalizeInsight(
  raw: RawKishinInsight,
  context: KifuAnalysisContext
): KishinInsight {
  const briefSummaries = (raw.briefSummaries ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 7);

  while (briefSummaries.length < 7) {
    briefSummaries.push("");
  }

  const turningPoints: KishinTurningPoint[] = (raw.turningPoints ?? [])
    .filter((tp) => tp && tp.moveNumber && tp.move)
    .map((tp) => ({
      moveNumber: Number(tp.moveNumber),
      move: String(tp.move).trim(),
      evalChange: String(tp.evalChange ?? "").trim(),
      topCandidate: String(tp.topCandidate ?? "").trim(),
      insight: String(tp.insight ?? "").trim(),
    }))
    .filter((tp) => tp.insight || tp.evalChange || tp.topCandidate);

  return {
    briefSummaries,
    turningPoints,
    playerPerspectiveApplied: context.playerSide != null,
    insightFormatVersion: KISHIN_INSIGHT_FORMAT_VERSION,
  };
}

function parseAnalysisContext(
  body: SummarizeKifuRequest
): KifuAnalysisContext {
  const playerSide =
    body.playerSide === "sente" || body.playerSide === "gote"
      ? body.playerSide
      : null;
  const result =
    body.result === "win" || body.result === "loss" || body.result === "draw"
      ? body.result
      : null;
  return { playerSide, result };
}

async function callClaude(
  apiKey: string,
  kifuText: string,
  context: KifuAnalysisContext
): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SUMMARIZE_KIFU_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: SUMMARIZE_KIFU_USER_PROMPT(kifuText, context) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Claude kifu summarize error:", detail);
    throw new Error("棋神示唆の生成に失敗しました。もう一度お試しください。");
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("棋神示唆の生成結果が空でした。");
  return text;
}

async function callOpenAI(
  apiKey: string,
  kifuText: string,
  context: KifuAnalysisContext
): Promise<string> {
  const model = process.env.OPENAI_SUMMARIZE_MODEL ?? "gpt-4o";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SUMMARIZE_KIFU_SYSTEM_PROMPT },
        { role: "user", content: SUMMARIZE_KIFU_USER_PROMPT(kifuText, context) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI kifu summarize error:", detail);
    throw new Error("棋神示唆の生成に失敗しました。もう一度お試しください。");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("棋神示唆の生成結果が空でした。");
  return text;
}

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    return NextResponse.json(
      {
        error:
          "APIキーが設定されていません。OPENAI_API_KEY または ANTHROPIC_API_KEY を設定してください。",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as SummarizeKifuRequest;
    const kifuText = body.kifuText?.trim();

    if (!kifuText) {
      return NextResponse.json(
        { error: "棋譜テキストが空です。" },
        { status: 400 }
      );
    }

    const trimmedKifu = trimKifuForAnalysis(kifuText);
    const context = parseAnalysisContext(body);
    const summaryText = anthropicKey
      ? await callClaude(anthropicKey, trimmedKifu, context)
      : await callOpenAI(openaiKey!, trimmedKifu, context);

    const raw = extractJson(summaryText);
    const insight = normalizeInsight(raw, context);

    const hasContent =
      insight.briefSummaries.some(Boolean) || insight.turningPoints.length > 0;
    if (!hasContent) {
      return NextResponse.json(
        { error: "棋神示唆を抽出できませんでした。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("summarize-kifu error:", error);
    const message =
      error instanceof SyntaxError
        ? "棋神示唆の形式が正しくありませんでした。もう一度お試しください。"
        : error instanceof Error
          ? error.message
          : "棋神示唆の生成中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
