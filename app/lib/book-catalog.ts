export type BookCategory =
  | "tsumeshogi"
  | "opening"
  | "midgame"
  | "endgame"
  | "general";

export type BookCatalogEntry = {
  id: string;
  title: string;
  category: BookCategory;
  /** 弱点分析タグとの対応 */
  coversTags: string[];
  /** 学習メニューでの具体的なやり方 */
  studyAction: string;
  /** 未購入でも弱点克服のために推薦する定番書 */
  isFamous: boolean;
  purchaseReason: string;
};

export const BOOK_CATEGORY_LABELS: Record<BookCategory, string> = {
  tsumeshogi: "詰将棋",
  opening: "序盤・戦型",
  midgame: "中盤",
  endgame: "終盤・寄せ",
  general: "総合",
};

export const BOOK_CATALOG: BookCatalogEntry[] = [
  {
    id: "gote-handbook",
    title: "五手詰ハンドブック",
    category: "tsumeshogi",
    coversTags: [
      "寄せの読み漏れ",
      "詰み逃し・逆転の見落とし",
      "時間切れ",
    ],
    studyAction: "詰め将棋を解く（1日5〜10問）",
    isFamous: true,
    purchaseReason: "短い読みの基礎を固める定番。弱点タグの終盤・読み系に直結する。",
  },
  {
    id: "yose-200",
    title: "寄せの手筋200",
    category: "endgame",
    coversTags: ["寄せの読み漏れ", "勝ち切りの手筋不足"],
    studyAction: "該当する手筋の問題を読む",
    isFamous: true,
    purchaseReason: "寄せ・勝ち切りの弱点を克服する定番書。実戦で再現しやすい手筋が多い。",
  },
  {
    id: "3te-tsume",
    title: "三段目までの詰将棋",
    category: "tsumeshogi",
    coversTags: ["寄せの読み漏れ", "詰み逃し・逆転の見落とし"],
    studyAction: "詰め将棋を解く",
    isFamous: false,
    purchaseReason: "五手詰の次のステップとして読みの幅を広げられる。",
  },
  {
    id: "joseki-tettei",
    title: "定跡の徹底理解",
    category: "opening",
    coversTags: ["序盤の手筋選択", "型の選択・準備不足"],
    studyAction: "自分の戦型に関係する章を読む",
    isFamous: false,
    purchaseReason: "序盤の型選び・準備不足の弱点に向く。",
  },
  {
    id: "shobu-no-joseki",
    title: "勝負の定跡",
    category: "opening",
    coversTags: ["序盤の手筋選択", "序盤の駒組み"],
    studyAction: "採用戦型の定跡を復習する",
    isFamous: false,
    purchaseReason: "序盤の駒組み・手筋選択の弱点克服に。",
  },
  {
    id: "chuban-no-tesuji",
    title: "中盤の手筋",
    category: "midgame",
    coversTags: [
      "中盤の読み（攻めるか受けるか）",
      "攻めの手順選択",
      "守りの手筋選択",
      "逆手への対応不足",
    ],
    studyAction: "弱点に近い手筋の章を読む",
    isFamous: false,
    purchaseReason: "中盤の攻守判断・手筋選択の弱点に対応。",
  },
  {
    id: "kakukawari-joseki",
    title: "角換わりの定跡",
    category: "opening",
    coversTags: ["序盤の手筋選択", "序盤の駒組み"],
    studyAction: "角換わりの定跡を復習する",
    isFamous: false,
    purchaseReason: "角換わり戦型を採用している場合の序盤強化に。",
  },
  {
    id: "migigyoku-jissen",
    title: "右玉の実戦",
    category: "opening",
    coversTags: ["序盤の手筋選択", "攻めの駒組み"],
    studyAction: "右玉の攻め手順を復習する",
    isFamous: false,
    purchaseReason: "右玉・攻め駒組みの弱点がある場合に有効。",
  },
  {
    id: "yose-jissen",
    title: "寄せの実戦手筋",
    category: "endgame",
    coversTags: ["寄せの読み漏れ", "勝ち切りの手筋不足"],
    studyAction: "寄せ手筋の例題を読む",
    isFamous: false,
    purchaseReason: "終盤の読み漏れ・勝ち切り不足の補強に。",
  },
  {
    id: "shogi-kiso",
    title: "将棋の基礎",
    category: "general",
    coversTags: ["型の選択・準備不足", "想定外の手への対応不足"],
    studyAction: "基礎手筋を復習する",
    isFamous: false,
    purchaseReason: "全般的な基礎の穴埋めに。",
  },
];

export function getBookById(id: string): BookCatalogEntry | undefined {
  return BOOK_CATALOG.find((book) => book.id === id);
}

export function booksByCategory(): Record<BookCategory, BookCatalogEntry[]> {
  const grouped = {} as Record<BookCategory, BookCatalogEntry[]>;
  for (const cat of Object.keys(BOOK_CATEGORY_LABELS) as BookCategory[]) {
    grouped[cat] = [];
  }
  for (const book of BOOK_CATALOG) {
    grouped[book.category].push(book);
  }
  return grouped;
}
