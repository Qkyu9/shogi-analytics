import { NextRequest, NextResponse } from "next/server";
import type { GameRecordDraft, GamePosition, VenueType } from "@/app/lib/types";
import {
  SUMMARIZE_SYSTEM_PROMPT,
  SUMMARIZE_USER_PROMPT,
} from "@/app/lib/prompts/summarize";
import {
  resolveMigiGyokuInText,
  resolveMyStrategy,
} from "@/app/lib/migi-gyoku-strategy";
import { applyDictionaryCorrections } from "@/app/lib/shogi-term-corrections";
import { resolveHandicapFields } from "@/app/lib/handicap";
import { normalizeWeaknessTag } from "@/app/lib/weakness-tags";

function finalizeText(text: string): string {
  return resolveMigiGyokuInText(applyDictionaryCorrections(text));
}

const VALID_VENUES: VenueType[] = [
  "shogi_wars_10min",
  "shogi_wars_sprint",
  "kion",
  "other",
];

type SummarizeRequest = {
  transcript: string;
  venueType?: VenueType;
};

type RawSummary = {
  playedAt?: string;
  venueType?: string;
  handicap?: string;
  playerSide?: string;
  result?: string;
  myStrategy?: string;
  opponentStrategy?: string;
  opponentRank?: string;
  positions?: Array<Partial<GamePosition>>;
  tags?: string[];
};

function extractJson(text: string): RawSummary {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as RawSummary;
}

function normalizeVenue(value?: string): VenueType {
  if (value && VALID_VENUES.includes(value as VenueType)) {
    return value as VenueType;
  }
  return "other";
}

function normalizeResult(value?: string): GameRecordDraft["result"] {
  if (value === "win" || value === "draw") return value;
  return "loss";
}

function nowJstForPrompt(): string {
  return new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePlayedAt(value?: string): string {
  const now = new Date();
  if (!value) return now.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return now.toISOString();
  if (parsed.getFullYear() < now.getFullYear() - 1) return now.toISOString();
  return parsed.toISOString();
}

function toDraft(
  raw: RawSummary,
  fallbackVenue?: VenueType,
  transcript?: string
): GameRecordDraft {
  const positions: GamePosition[] = (raw.positions ?? [])
    .filter((p) => p && (p.sceneDescription || p.defeatCause))
    .map((p) => ({
      sceneDescription: finalizeText(p.sceneDescription?.trim() ?? ""),
      defeatCause: finalizeText(p.defeatCause?.trim() ?? ""),
      correctMove: finalizeText(p.correctMove?.trim() ?? ""),
      lesson: finalizeText(p.lesson?.trim() ?? ""),
    }));

  const myStrategyRaw = raw.myStrategy?.trim() ?? "";
  const { handicap, playerSide } = resolveHandicapFields(
    raw.handicap?.trim() ?? "",
    raw.playerSide
  );

  return {
    playedAt: normalizePlayedAt(raw.playedAt),
    venueType: normalizeVenue(raw.venueType) ?? fallbackVenue ?? "other",
    handicap,
    playerSide,
    result: normalizeResult(raw.result),
    myStrategy: resolveMyStrategy(myStrategyRaw, transcript),
    opponentStrategy: finalizeText(raw.opponentStrategy?.trim() ?? ""),
    opponentRank: finalizeText(raw.opponentRank?.trim() ?? ""),
    positions:
      positions.length > 0
        ? positions
        : [
            {
              sceneDescription: "",
              defeatCause: "",
              correctMove: "",
              lesson: "",
            },
          ],
    tags: (raw.tags ?? [])
      .map(normalizeWeaknessTag)
      .filter(Boolean),
  };
}

async function callClaude(
  apiKey: string,
  transcript: string,
  nowJst: string
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
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: SUMMARIZE_USER_PROMPT(transcript, nowJst) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Claude API error:", detail);
    throw new Error("要約の生成に失敗しました。もう一度お試しください。");
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("要約の生成結果が空でした。");
  return text;
}

async function callOpenAI(
  apiKey: string,
  transcript: string,
  nowJst: string
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
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        { role: "user", content: SUMMARIZE_USER_PROMPT(transcript, nowJst) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI summarize error:", detail);
    throw new Error("要約の生成に失敗しました。もう一度お試しください。");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("要約の生成結果が空でした。");
  return text;
}

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    return NextResponse.json(
      {
        error:
          "APIキーが設定されていません。demo-implementation/.env.local に OPENAI_API_KEY または ANTHROPIC_API_KEY を追加してください。",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as SummarizeRequest;
    const transcript = body.transcript?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "文字起こしテキストが空です。" },
        { status: 400 }
      );
    }

    const nowJst = nowJstForPrompt();
    const summaryText = anthropicKey
      ? await callClaude(anthropicKey, transcript, nowJst)
      : await callOpenAI(openaiKey!, transcript, nowJst);

    const raw = extractJson(summaryText);
    const draft = toDraft(raw, body.venueType, transcript);

    return NextResponse.json({ draft, transcript });
  } catch (error) {
    console.error("summarize error:", error);
    const message =
      error instanceof SyntaxError
        ? "要約の形式が正しくありませんでした。もう一度お試しください。"
        : "要約処理中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
