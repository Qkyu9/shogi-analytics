import { NextRequest, NextResponse } from "next/server";
import type { GameRecordDraft, GamePosition, VenueType } from "@/app/lib/types";
import { VENUE_TYPES } from "@/app/lib/types";
import {
  callLlmText,
  extractJsonBlock,
  hasLlmApiKey,
} from "@/app/lib/llm-client";
import {
  SUMMARIZE_SYSTEM_PROMPT,
  SUMMARIZE_USER_PROMPT,
} from "@/app/lib/prompts/summarize";
import {
  resolveMigiGyokuInText,
  resolveMyStrategy,
} from "@/app/lib/migi-gyoku-strategy";
import { applyDictionaryCorrections } from "@/app/lib/shogi-term-corrections";
import {
  enrichOpponentRank,
  resolveHandicapFromSummary,
} from "@/app/lib/transcript-inference";
import { normalizeWeaknessTag } from "@/app/lib/weakness-tags";

function finalizeText(text: string): string {
  return resolveMigiGyokuInText(applyDictionaryCorrections(text));
}

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

function normalizeVenue(value?: string): VenueType {
  if (value && (VENUE_TYPES as readonly string[]).includes(value)) {
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

  const myStrategyRaw = applyDictionaryCorrections(
    raw.myStrategy?.trim() ?? ""
  );
  const venueType = normalizeVenue(raw.venueType) ?? fallbackVenue ?? "other";
  const transcriptText = transcript ?? "";

  const { handicap, playerSide } = resolveHandicapFromSummary(
    raw.handicap?.trim() ?? "",
    raw.playerSide,
    transcriptText,
    venueType
  );

  return {
    playedAt: normalizePlayedAt(raw.playedAt),
    venueType,
    handicap,
    playerSide,
    result: normalizeResult(raw.result),
    myStrategy: resolveMyStrategy(myStrategyRaw, transcript),
    opponentStrategy: finalizeText(raw.opponentStrategy?.trim() ?? ""),
    opponentRank: enrichOpponentRank(
      raw.opponentRank?.trim() ?? "",
      transcriptText,
      venueType
    ),
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

export async function POST(request: NextRequest) {
  if (!hasLlmApiKey()) {
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
    const summaryText = await callLlmText({
      system: SUMMARIZE_SYSTEM_PROMPT,
      user: SUMMARIZE_USER_PROMPT(transcript, nowJst),
      maxTokens: 4096,
      failMessage: "要約の生成に失敗しました。もう一度お試しください。",
      emptyMessage: "要約の生成結果が空でした。",
      logLabel: "summarize",
    });

    const raw = extractJsonBlock<RawSummary>(summaryText);
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
