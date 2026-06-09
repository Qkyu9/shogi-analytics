import type { BookCategory } from "@/app/lib/book-catalog";

export type KnownBookProfile = {
  id: string;
  /** 販売ページ等で確認した正式表記（表示・保存時の正本） */
  canonicalTitle: string;
  /** 同一棋書として扱う別表記 */
  aliases: string[];
  /** 表記の根拠（メンテナンス用） */
  titleSource?: string;
  /** 確認済みのAmazon商品ページ（あれば検索より優先） */
  amazonUrl?: string;
  category: BookCategory;
  coversTags: string[];
  studyAction: string;
  isFamous: boolean;
  purchaseReason: string;
  description: string;
};

const DIGIT_TO_KANJI: Record<string, string> = {
  "0": "〇",
  "1": "一",
  "2": "二",
  "3": "三",
  "4": "四",
  "5": "五",
  "6": "六",
  "7": "七",
  "8": "八",
  "9": "九",
};

/** 実在する定番棋書（分類・表記ゆれ照合用） */
export const KNOWN_BOOK_PROFILES: KnownBookProfile[] = [
  {
    id: "gote-handbook",
    canonicalTitle: "5手詰ハンドブック",
    aliases: [
      "5手詰ハンドブック",
      "五手詰ハンドブック",
      "5手詰めハンドブック",
      "ご手詰めハンドブック",
    ],
    titleSource: "Amazon商品ページ（ASIN 4861370353）",
    amazonUrl: "https://www.amazon.co.jp/dp/4861370353",
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし", "時間切れ"],
    studyAction: "詰め将棋を解く（1日5〜10問）",
    isFamous: false,
    purchaseReason:
      "短い読みの基礎を固める定番。終盤の読み漏れ・詰み逃しの弱点に直結する。",
    description: "詰将棋の入門定番。五手以内の詰め問題集。",
  },
  {
    id: "yose-200",
    canonicalTitle: "寄せの手筋200",
    aliases: ["寄せの手筋200", "寄せの手筋 200"],
    category: "endgame",
    coversTags: ["寄せの読み漏れ", "勝ち切りの手筋不足"],
    studyAction: "該当する寄せ手筋の問題を読む",
    isFamous: false,
    purchaseReason:
      "詰みまで行かない段階の寄せ・勝ち切りを学ぶ定番。終盤の弱点克服に有効。",
    description: "終盤の寄せ手筋200問。詰将棋ではなく寄せの形を学ぶ。",
  },
  {
    id: "kishinogi-200",
    canonicalTitle: "凌ぎの手筋200",
    aliases: ["凌ぎの手筋200", "凌ぎの手筋 200"],
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
    canonicalTitle: "3段目までの詰将棋",
    aliases: ["3段目までの詰将棋", "三段目までの詰将棋"],
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし"],
    studyAction: "詰め将棋を解く",
    isFamous: false,
    purchaseReason: "5手詰の次のステップとして読みの幅を広げられる。",
    description: "三段目までの詰将棋問題集。",
  },
  {
    id: "3te-tsume-handbook",
    canonicalTitle: "3手詰ハンドブック",
    aliases: ["3手詰ハンドブック", "三手詰ハンドブック"],
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし"],
    studyAction: "詰め将棋を解く",
    isFamous: false,
    purchaseReason: "短い詰将棋で終盤の読みを鍛える。",
    description: "三手以内の詰将棋問題集。",
  },
];

function allProfileTitles(profile: KnownBookProfile): string[] {
  return [profile.canonicalTitle, ...profile.aliases];
}

/** 書名比較用：空白除去・算用数字→漢数字・表記ゆれを統一 */
export function normalizeBookTitle(title: string): string {
  return title
    .trim()
    .replace(/[　\s]+/g, "")
    .replace(/[0-9]/g, (d) => DIGIT_TO_KANJI[d] ?? d)
    .replace(/詰め/g, "詰")
    .replace(/つめ/g, "詰")
    .toLowerCase();
}

export function findKnownBook(title: string): KnownBookProfile | null {
  const normalized = normalizeBookTitle(title);
  if (!normalized) return null;

  for (const profile of KNOWN_BOOK_PROFILES) {
    for (const alias of allProfileTitles(profile)) {
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

/** 定番棋書なら販売ページ等で確認した正式表記にそろえる */
export function getCanonicalBookTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  const known = findKnownBook(trimmed);
  return known ? known.canonicalTitle : trimmed;
}

/** 同一棋書か（5手詰と五手詰など表記ゆれを同一視） */
export function isSameBookTitle(a: string, b: string): boolean {
  const normA = normalizeBookTitle(a);
  const normB = normalizeBookTitle(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const knownA = findKnownBook(a);
  const knownB = findKnownBook(b);
  if (knownA && knownB) return knownA.id === knownB.id;

  return false;
}

export function isBookOwned(
  ownedBooks: Array<{ title: string }>,
  profile: KnownBookProfile
): boolean {
  return ownedBooks.some((book) => {
    const known = findKnownBook(book.title);
    if (known) return known.id === profile.id;
    return isSameBookTitle(book.title, profile.canonicalTitle);
  });
}

export function getKnownBookById(id: string): KnownBookProfile | undefined {
  return KNOWN_BOOK_PROFILES.find((p) => p.id === id);
}

export const FAMOUS_BOOK_IDS = KNOWN_BOOK_PROFILES.filter((p) => p.isFamous).map(
  (p) => p.id
);

/** 購入推薦用のAmazon検索URL（外部API不要・軽量） */
export function buildAmazonSearchUrl(bookTitle: string): string {
  const query = encodeURIComponent(`${bookTitle} 将棋`);
  return `https://www.amazon.co.jp/s?k=${query}`;
}

/** 棋書のAmazonリンク（確認済み商品ページがあれば優先） */
export function buildAmazonUrl(bookTitle: string): string {
  const known = findKnownBook(bookTitle);
  if (known?.amazonUrl) return known.amazonUrl;
  return buildAmazonSearchUrl(getCanonicalBookTitle(bookTitle));
}
