/**
 * 将棋用語の既知誤変換パターン（シード辞書）。
 * 手作業で全語彙を網羅するのではなく、LLM補正の参考例＋高信頼の後処理に使う。
 */
export type ShogiCorrection = {
  wrong: string;
  correct: string;
  note?: string;
};

export const SHOGI_CORRECTION_SEED: ShogiCorrection[] = [
  { wrong: "8号系", correct: "8五桂", note: "8五の桂打ち・桂跳ね" },
  { wrong: "８号系", correct: "8五桂" },
  { wrong: "8号形", correct: "8五桂" },
  { wrong: "右翼", correct: "右玉", note: "戦型名（文脈で雁木右玉・角換わり右玉・対振り右玉に展開）" },
  { wrong: "一定存", correct: "角換わり" },
  { wrong: "角代わり", correct: "角換わり", note: "表記統一" },
  { wrong: "木の音", correct: "棋の音" },
  { wrong: "木の根", correct: "棋の音" },
  { wrong: "キシン", correct: "棋神アナリティクス" },
  { wrong: "棋神", correct: "棋神アナリティクス", note: "文脈で棋神アナリティクスを指す場合" },
  { wrong: "寄付", correct: "棋譜" },
  { wrong: "7七桂成り", correct: "7七桂成" },
  { wrong: "桂成り", correct: "桂成", note: "成り→成（棋譜表記）" },
  { wrong: "銀成り", correct: "銀成" },
  { wrong: "歩成り", correct: "歩成" },
  { wrong: "角成り", correct: "角成" },
  { wrong: "飛成り", correct: "飛成" },
  { wrong: "疑問種", correct: "疑問手" },
  { wrong: "試験飛車", correct: "四間飛車", note: "しけんびしゃの誤変換" },
  { wrong: "四軒飛車", correct: "四間飛車" },
  { wrong: "3軒飛車", correct: "三間飛車" },
  { wrong: "三軒飛車", correct: "三間飛車" },
  { wrong: "向い飛車", correct: "向かい飛車", note: "表記統一" },
];

/** プロンプト用：誤変換の例を列挙 */
export function formatCorrectionExamplesForPrompt(): string {
  return SHOGI_CORRECTION_SEED.filter((c) => c.wrong !== c.correct)
    .map((c) => `- ${c.wrong} → ${c.correct}${c.note ? `（${c.note}）` : ""}`)
    .join("\n");
}

/** LLM補正後の高信頼パターンを機械的に再チェック */
export function applyDictionaryCorrections(text: string): string {
  let result = text;
  for (const { wrong, correct } of SHOGI_CORRECTION_SEED) {
    if (wrong === correct) continue;
    result = result.split(wrong).join(correct);
  }
  return result;
}
