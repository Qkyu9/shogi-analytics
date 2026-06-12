/**
 * Claude / OpenAI 呼び出しの共通クライアント（サーバー側専用）。
 *
 * モデル名・認証・レスポンスの取り出しをここに一元化する。
 * 要約（summarize）・棋譜要約（summarize-kifu）・棋書分類（book-classifier）が共通で使う。
 * モデルを変更したいときは、環境変数（ANTHROPIC_MODEL / OPENAI_SUMMARIZE_MODEL）か
 * このファイルのデフォルト値だけ直せばよい。
 *
 * ANTHROPIC_API_KEY があれば Claude を優先し、なければ OpenAI を使う。
 */

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

export type LlmCallOptions = {
  system: string;
  user: string;
  maxTokens: number;
  /** API呼び出しが失敗したときにユーザーへ返すメッセージ */
  failMessage: string;
  /** 生成結果が空だったときにユーザーへ返すメッセージ */
  emptyMessage: string;
  /** サーバーログ（console.error）用のラベル */
  logLabel: string;
};

/** Claude / OpenAI いずれかのAPIキーが設定されているか */
export function hasLlmApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

async function callClaude(
  apiKey: string,
  opts: LlmCallOptions
): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`${opts.logLabel} (Claude):`, detail);
    throw new Error(opts.failMessage);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error(opts.emptyMessage);
  return text;
}

async function callOpenAI(
  apiKey: string,
  opts: LlmCallOptions
): Promise<string> {
  const model = process.env.OPENAI_SUMMARIZE_MODEL ?? DEFAULT_OPENAI_MODEL;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`${opts.logLabel} (OpenAI):`, detail);
    throw new Error(opts.failMessage);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(opts.emptyMessage);
  return text;
}

/** JSONを返すLLM呼び出し。Claude優先、なければOpenAI */
export async function callLlmText(opts: LlmCallOptions): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) return callClaude(anthropicKey, opts);
  if (openaiKey) return callOpenAI(openaiKey, opts);
  throw new Error("APIキーが設定されていません。");
}

/** LLM出力（```json フェンス付きを含む）からJSONを取り出す */
export function extractJsonBlock<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as T;
}
