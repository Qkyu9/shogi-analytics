/** 棋神棋譜が長いとき、LLM送信用に候補2・3を除いて圧縮する */
export function trimKifuForAnalysis(
  kifuText: string,
  maxChars = 60_000
): string {
  const lines = kifuText.split("\n");
  const kept = lines.filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/候補[23]/.test(t)) return false;
    if (/^\d+\s+/.test(t)) return true;
    if (/候補1/.test(t)) return true;
    if (
      /^(開始|終了|場所|持ち時間|手合割|初期局面|先手|後手|手数)/.test(t)
    ) {
      return true;
    }
    if (/投了|まで\d+手/.test(t)) return true;
    return false;
  });

  let result = kept.join("\n");
  if (result.length > maxChars) {
    result = `${result.slice(0, maxChars)}\n...（以降省略）`;
  }
  return result;
}
