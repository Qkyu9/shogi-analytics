import {
  BOOK_CATEGORY_OPTIONS,
  DEFAULT_STUDY_ACTION,
  type BookCategory,
} from "@/app/lib/book-catalog";
import {
  findKnownBook,
  getCanonicalBookTitle,
  type KnownBookProfile,
} from "@/app/lib/known-books";
import {
  callLlmText,
  extractJsonBlock,
  hasLlmApiKey,
} from "@/app/lib/llm-client";

export type BookClassification = {
  title: string;
  category: BookCategory;
  studyAction: string;
  coversTags: string[];
  confidence: "high" | "medium" | "low";
  source: "known" | "web" | "ai";
  sourceNote: string;
};

async function fetchWebContext(title: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${title} 将棋 棋書`);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return "";
    const data = (await res.json()) as {
      AbstractText?: string;
      Heading?: string;
      RelatedTopics?: Array<{ Text?: string }>;
    };
    const parts = [
      data.Heading,
      data.AbstractText,
      ...(data.RelatedTopics ?? []).slice(0, 3).map((t) => t.Text),
    ].filter(Boolean);
    return parts.join("\n");
  } catch {
    return "";
  }
}

function fromKnownProfile(
  profile: KnownBookProfile,
  title: string
): BookClassification {
  return {
    title: getCanonicalBookTitle(title.trim() || profile.canonicalTitle),
    category: profile.category,
    studyAction: profile.studyAction,
    coversTags: profile.coversTags,
    confidence: "high",
    source: "known",
    sourceNote: "定番棋書データベースから判別",
  };
}

function normalizeCategory(value: unknown): BookCategory {
  const v = String(value ?? "").trim();
  if (BOOK_CATEGORY_OPTIONS.includes(v as BookCategory)) {
    return v as BookCategory;
  }
  return "general";
}

async function classifyWithAI(
  title: string,
  webContext: string
): Promise<BookClassification> {
  if (!hasLlmApiKey()) {
    return {
      title: title.trim(),
      category: "general",
      studyAction: DEFAULT_STUDY_ACTION.general,
      coversTags: [],
      confidence: "low",
      source: "ai",
      sourceNote: "APIキー未設定のため総合に分類",
    };
  }

  const categories = BOOK_CATEGORY_OPTIONS.map(
    (c) => `${c}（${c === "tsumeshogi" ? "詰将棋" : c === "endgame" ? "終盤寄せ（詰み前）" : c === "defense" ? "受け・凌ぎ" : c}）`
  ).join("、");

  const system = `あなたは将棋棋書の分類アシスタントです。
書名から棋書の種類を判別し、JSONのみを返してください。
- 書名の表記（算用数字か漢数字かなど）は、Web参考情報や商品ページの正式名称に合わせる。ユーザー入力と販売表記が異なる場合は正式名称を title に使う
- tsumeshogi: 詰将棋問題集（五手詰ハンドブック等）
- endgame: 終盤・寄せ（詰みまで行かない寄せ手筋。寄せの手筋200等）
- defense: 受け・凌ぎ（凌ぎの手筋200等）
- opening: 序盤・戦型・定跡
- midgame: 中盤手筋
- general: 総合（大局観・構想・上達論など、特定の局面に限らない本）`;

  const user = `棋書のタイトル: ${title}

${webContext ? `Web上の参考情報:\n${webContext}\n` : ""}
カテゴリ候補: ${categories}

JSON形式:
{
  "title": "販売ページ・公式表記に合わせた正式書名（入力の表記ゆれはここで正す）",
  "category": "tsumeshogi | opening | midgame | endgame | defense | general",
  "studyAction": "この本で何をすればよいか（1文）",
  "coversTags": ["弱点分析に関連しうるタグを0〜3個"],
  "confidence": "high | medium | low",
  "reason": "判別理由（1文）"
}`;

  const rawText = await callLlmText({
    system,
    user,
    maxTokens: 512,
    failMessage: "棋書の判別に失敗しました",
    emptyMessage: "棋書の判別に失敗しました",
    logLabel: "classify-book",
  });

  const raw = extractJsonBlock<Record<string, unknown>>(rawText);
  const category = normalizeCategory(raw.category);
  const studyAction =
    String(raw.studyAction ?? "").trim() || DEFAULT_STUDY_ACTION[category];
  const coversTags = Array.isArray(raw.coversTags)
    ? raw.coversTags.map(String).filter(Boolean).slice(0, 3)
    : [];
  const confidence =
    raw.confidence === "high" || raw.confidence === "medium"
      ? raw.confidence
      : "low";

  const aiTitle = String(raw.title ?? "").trim();
  const resolvedTitle = getCanonicalBookTitle(aiTitle || title.trim());

  return {
    title: resolvedTitle,
    category,
    studyAction,
    coversTags,
    confidence,
    source: webContext ? "web" : "ai",
    sourceNote: String(raw.reason ?? "AIが書名から判別"),
  };
}

export async function classifyBookTitle(
  title: string
): Promise<BookClassification> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("書名を入力してください");
  }

  const known = findKnownBook(trimmed);
  if (known) return fromKnownProfile(known, trimmed);

  const webContext = await fetchWebContext(trimmed);
  return classifyWithAI(trimmed, webContext);
}
