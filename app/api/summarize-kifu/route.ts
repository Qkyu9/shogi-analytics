import { NextRequest, NextResponse } from "next/server";
import type { PlayerSide } from "@/app/lib/handicap";
import type { KifuAnalysisContext } from "@/app/lib/kifu-player-context";
import {
  callLlmText,
  extractJsonBlock,
  hasLlmApiKey,
} from "@/app/lib/llm-client";
import { trimKifuForAnalysis } from "@/app/lib/kifu-text-trim";
import {
  kifuMoveMatches,
  parseKifuMoveIndex,
} from "@/app/lib/kifu-move-index";
import {
  KISHIN_INSIGHT_FORMAT_VERSION,
  SUMMARIZE_KIFU_SYSTEM_PROMPT,
  SUMMARIZE_KIFU_USER_PROMPT,
} from "@/app/lib/prompts/summarize-kifu";
import { sanitizeKishinInsight } from "@/app/lib/kishin-insight-sanitize";
import {
  enrichKishinInsight,
  filterAndSupplementTurningPoints,
} from "@/app/lib/kishin-insight-postprocess";
import type { GameResult, KishinInsight, KishinTurningPoint } from "@/app/lib/types";

type SummarizeKifuRequest = {
  kifuText: string;
  playerSide?: PlayerSide | null;
  result?: GameResult | null;
  verbalSummaryText?: string | null;
};

type RawKishinInsight = {
  briefSummaries?: string[];
  turningPoints?: Array<Partial<KishinTurningPoint>>;
};

function alignTurningPointsWithKifu(
  points: KishinTurningPoint[],
  kifuText: string
): KishinTurningPoint[] {
  const index = parseKifuMoveIndex(kifuText);
  if (index.size === 0) return points;

  return points.map((tp) => {
    const actual = index.get(tp.moveNumber);
    if (!actual) return tp;
    if (kifuMoveMatches(index, tp.moveNumber, tp.move)) return tp;
    return { ...tp, move: actual };
  });
}

function normalizeInsight(
  raw: RawKishinInsight,
  context: KifuAnalysisContext,
  kifuText: string
): KishinInsight {
  const briefSummaries = (raw.briefSummaries ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 7);

  while (briefSummaries.length < 7) {
    briefSummaries.push("");
  }

  const turningPoints = alignTurningPointsWithKifu(
    (raw.turningPoints ?? [])
      .filter((tp) => tp && tp.moveNumber && tp.move)
      .map((tp) => ({
        moveNumber: Number(tp.moveNumber),
        move: String(tp.move).trim(),
        evalChange: String(tp.evalChange ?? "").trim(),
        topCandidate: String(tp.topCandidate ?? "").trim(),
        insight: String(tp.insight ?? "").trim(),
      }))
      .filter((tp) => tp.insight || tp.evalChange || tp.topCandidate),
    kifuText
  );

  const playerFiltered = filterAndSupplementTurningPoints(
    turningPoints,
    kifuText,
    context.playerSide
  );

  return enrichKishinInsight(
    sanitizeKishinInsight(
      {
        briefSummaries,
        turningPoints: playerFiltered,
        playerPerspectiveApplied: context.playerSide != null,
        insightFormatVersion: KISHIN_INSIGHT_FORMAT_VERSION,
      },
      kifuText
    ),
    kifuText,
    context.playerSide
  );
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
  const verbal = body.verbalSummaryText?.trim();
  return {
    playerSide,
    result,
    verbalSummaryText: verbal || null,
  };
}

export async function POST(request: NextRequest) {
  if (!hasLlmApiKey()) {
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
    const summaryText = await callLlmText({
      system: SUMMARIZE_KIFU_SYSTEM_PROMPT,
      user: SUMMARIZE_KIFU_USER_PROMPT(trimmedKifu, context),
      maxTokens: 4096,
      failMessage: "棋神示唆の生成に失敗しました。もう一度お試しください。",
      emptyMessage: "棋神示唆の生成結果が空でした。",
      logLabel: "summarize-kifu",
    });

    const raw = extractJsonBlock<RawKishinInsight>(summaryText);
    const insight = normalizeInsight(raw, context, trimmedKifu);

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
