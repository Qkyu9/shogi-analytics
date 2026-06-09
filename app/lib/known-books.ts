import type { BookCategory } from "@/app/lib/book-catalog";

export type KnownBookProfile = {
  id: string;
  titles: string[];
  category: BookCategory;
  coversTags: string[];
  studyAction: string;
  isFamous: boolean;
  purchaseReason: string;
  description: string;
};

/** 実在する定番棋書のみ（設定画面のダミー一覧には使わない） */
export const KNOWN_BOOK_PROFILES: KnownBookProfile[] = [
  {
    id: "gote-handbook",
    titles: ["五手詰ハンドブック", "ご手詰めハンドブック", "5手詰ハンドブック"],
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし", "時間切れ"],
    studyAction: "詰め将棋を解く（1日5〜10問）",
    isFamous: true,
    purchaseReason:
      "短い読みの基礎を固める定番。終盤の読み漏れ・詰み逃しの弱点に直結する。",
    description: "詰将棋の入門定番。五手以内の詰め問題集。",
  },
  {
    id: "yose-200",
    titles: ["寄せの手筋200", "寄せの手筋 200"],
    category: "endgame",
    coversTags: ["寄せの読み漏れ", "勝ち切りの手筋不足"],
    studyAction: "該当する寄せ手筋の問題を読む",
    isFamous: true,
    purchaseReason:
      "詰みまで行かない段階の寄せ・勝ち切りを学ぶ定番。終盤の弱点克服に有効。",
    description: "終盤の寄せ手筋200問。詰将棋ではなく寄せの形を学ぶ。",
  },
  {
    id: "kishinogi-200",
    titles: ["凌ぎの手筋200", "凌ぎの手筋 200"],
    category: "defense",
    coversTags: [
      "守りの手筋選択",
      "逆手への対応不足",
      "想定外の手への対応不足",
    ],
    studyAction: "凌ぎ・受けの手筋の問題を読む",
    isFamous: true,
    purchaseReason:
      "受け・凌ぎの精度が課題のときに有効な定番。守りの弱点に直結する。",
    description: "攻めを凌ぐ・受ける手筋200問。守備・受けの手筋集。",
  },
  {
    id: "3dan-tsume",
    titles: ["三段目までの詰将棋", "3段目までの詰将棋"],
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし"],
    studyAction: "詰め将棋を解く",
    isFamous: false,
    purchaseReason: "五手詰の次のステップとして読みの幅を広げられる。",
    description: "三段目までの詰将棋問題集。",
  },
];

export function normalizeBookTitle(title: string): string {
  return title
    .replace(/\s+/g, "")
    .replace(/[　]/g, "")
    .toLowerCase()
    .replace(/五手詰/g, "ご手詰め")
    .replace(/5手詰/g, "ご手詰め");
}

export function findKnownBook(title: string): KnownBookProfile | null {
  const normalized = normalizeBookTitle(title);
  if (!normalized) return null;

  for (const profile of KNOWN_BOOK_PROFILES) {
    for (const alias of profile.titles) {
      const aliasNorm = normalizeBookTitle(alias);
      if (
        normalized === aliasNorm ||
        normalized.includes(aliasNorm) ||
        aliasNorm.includes(normalized)
      ) {
        return profile;
      }
    }
  }
  return null;
}

export function getKnownBookById(id: string): KnownBookProfile | undefined {
  return KNOWN_BOOK_PROFILES.find((p) => p.id === id);
}

export const FAMOUS_BOOK_IDS = KNOWN_BOOK_PROFILES.filter((p) => p.isFamous).map(
  (p) => p.id
);
