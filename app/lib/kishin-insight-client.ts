import type { KifuAnalysisContext } from "@/app/lib/kifu-player-context";
import type { KishinInsight } from "./types";

export async function generateKishinInsight(
  kifuText: string,
  context: KifuAnalysisContext = { playerSide: null, result: null }
): Promise<KishinInsight> {
  const res = await fetch("/api/summarize-kifu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kifuText, ...context }),
  });

  const data = (await res.json()) as {
    insight?: KishinInsight;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "棋神示唆の生成に失敗しました。");
  }

  if (!data.insight) {
    throw new Error("棋神示唆データを取得できませんでした。");
  }

  return data.insight;
}
