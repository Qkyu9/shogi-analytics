import type { KnownBookProfile } from "@/app/lib/known-books";

export type BookCategory =
  | "tsumeshogi"
  | "opening"
  | "midgame"
  | "endgame"
  | "defense"
  | "general";

export const BOOK_CATEGORY_LABELS: Record<BookCategory, string> = {
  tsumeshogi: "詰将棋",
  opening: "序盤・戦型",
  midgame: "中盤",
  endgame: "終盤・寄せ",
  defense: "受け・凌ぎ",
  general: "総合",
};

export const BOOK_CATEGORY_OPTIONS: BookCategory[] = [
  "tsumeshogi",
  "opening",
  "midgame",
  "endgame",
  "defense",
  "general",
];

/** カテゴリごとの弱点タグ対応（ユーザー登録書のマッチング用） */
export const CATEGORY_COVERS_TAGS: Record<BookCategory, string[]> = {
  tsumeshogi: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし", "時間切れ"],
  endgame: ["寄せの読み漏れ", "勝ち切りの手筋不足"],
  defense: [
    "守りの手筋選択",
    "逆手への対応不足",
    "想定外の手への対応不足",
  ],
  midgame: [
    "中盤の読み（攻めるか受けるか）",
    "攻めの手順選択",
    "攻めの駒組み",
    "守りの手筋選択",
  ],
  opening: ["序盤の駒組み", "型の選択・準備不足"],
  general: ["型の選択・準備不足", "想定外の手への対応不足"],
};

export const DEFAULT_STUDY_ACTION: Record<BookCategory, string> = {
  tsumeshogi: "詰め将棋を解く",
  opening: "自分の戦型に関係する章を読む",
  midgame: "弱点に近い手筋の章を読む",
  endgame: "寄せ手筋の問題を読む",
  defense: "凌ぎ・受けの手筋を読む",
  general: "基礎手筋を復習する",
};

export function profileToDisplayTitle(profile: KnownBookProfile): string {
  return profile.canonicalTitle;
}
