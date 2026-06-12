import type { PlayerSide } from "./handicap";

export type GameResult = "win" | "loss" | "draw";

export type VenueType =
  | "shogi_wars_10min"
  | "shogi_wars_sprint"
  | "kion"
  | "other";

export type GamePosition = {
  sceneDescription: string;
  defeatCause: string;
  correctMove: string;
  lesson: string;
};

/** 棋神アナリティクスの評価・候補手から抽出した一局の要所 */
export type KishinTurningPoint = {
  moveNumber: number;
  move: string;
  evalChange: string;
  topCandidate: string;
  insight: string;
};

/** UI表示用：要所1件（本譜・候補は棋譜から機械取得） */
export type KishinDisplayTurningPoint = {
  moveNumber: number;
  actualMove: string;
  candidateMove: string;
  evalChange: string;
  /** 候補手の狙い（符号＋短い展開説明） */
  intent: string;
  /** 棋譜に記載された読み筋（原文・折りたたみ用） */
  readingLine: string;
};

/** UI表示用：棋神示唆のまとめ（第1段階） */
export type KishinDisplayModel = {
  opening: string;
  turningPoints: KishinDisplayTurningPoint[];
  endgame: string;
  lesson: string;
};

/** 棋神からの示唆（口頭要約とは独立） */
export type KishinInsight = {
  briefSummaries: string[];
  turningPoints: KishinTurningPoint[];
  /** 音声入力の手番・勝敗を反映して生成したか（旧データの再生成判定用） */
  playerPerspectiveApplied?: boolean;
  /** 端的なまとめの具体性ルールのバージョン（旧データの再生成判定用） */
  insightFormatVersion?: number;
};

export type GameRecordDraft = {
  playedAt: string;
  venueType: VenueType;
  /** 手合（例: 香落ち下手、平手・後手）。対局形式とは別フィールド */
  handicap: string;
  /** 自分の手番。未設定時は手合から推測 */
  playerSide: PlayerSide | null;
  result: GameResult;
  myStrategy: string;
  opponentStrategy: string;
  /** 相手の段位・級位（例: 会館初段、ウォーズ初段） */
  opponentRank: string;
  positions: GamePosition[];
  tags: string[];
  kifuText?: string;
  /** 棋神アナリティクス棋譜から生成した示唆 */
  kishinInsight?: KishinInsight;
  /** 音声STTまたは外部貼り付けの元テキスト（補正・要約前） */
  sourceInputText?: string;
};

export type GameRecordSummary = {
  id: string;
  playedAt: string;
  venueType: VenueType;
  venueLabel: string;
  handicap: string;
  playerSide: PlayerSide | null;
  result: GameResult;
  myStrategy: string;
  opponentStrategy: string;
  opponentRank: string;
  tags: string[];
  positionCount: number;
  /** 口頭要約（音声入力など）のデータあり */
  hasVoiceInput: boolean;
  /** 棋譜データ（棋神示唆含む）あり */
  hasKifuData: boolean;
  /** 棋譜データから抽出した弱点タグ（一覧表示用） */
  insightTags: string[];
};

export type GameRecordDetail = GameRecordSummary & {
  positions: (GamePosition & { sortOrder: number })[];
  kifuText?: string;
  kishinInsight?: KishinInsight;
  /** サーバー側で棋譜から組み立てた表示用データ */
  kishinDisplay?: KishinDisplayModel;
  sourceInputText?: string;
};

export type TagStat = {
  tag: string;
  count: number;
  percentage: number;
  latestRecordId: string | null;
};

export type StrategyStat = {
  strategy: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  latestRecordId: string | null;
  /** 上位概念にまとめた場合の内訳（元の戦型名ごとの成績） */
  children?: StrategyStat[];
};

export type StudyBookPick = {
  bookId: string;
  title: string;
  studyAction: string;
  isOwned: boolean;
};

export type StudyAllocation = {
  item: string;
  percentage: number;
  dailyCount?: number;
  reason: string;
  books?: StudyBookPick[];
};

export const VENUE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: "shogi_wars_10min", label: "将棋ウォーズ 10切れ" },
  { value: "shogi_wars_sprint", label: "将棋ウォーズ スプリント" },
  { value: "kion", label: "棋の音" },
  { value: "other", label: "その他" },
];

export const RESULT_LABELS: Record<GameResult, string> = {
  win: "勝ち",
  loss: "負け",
  draw: "引き分け",
};
