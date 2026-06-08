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

export type GameRecordDraft = {
  playedAt: string;
  venueType: VenueType;
  result: GameResult;
  myStrategy: string;
  opponentStrategy: string;
  /** 相手の段位・級位（例: 会館初段、ウォーズ初段） */
  opponentRank: string;
  positions: GamePosition[];
  tags: string[];
  kifuText?: string;
  /** 音声STTまたは外部貼り付けの元テキスト（補正・要約前） */
  sourceInputText?: string;
};

export type GameRecordSummary = {
  id: string;
  playedAt: string;
  venueType: VenueType;
  venueLabel: string;
  result: GameResult;
  myStrategy: string;
  opponentStrategy: string;
  opponentRank: string;
  tags: string[];
  positionCount: number;
};

export type GameRecordDetail = GameRecordSummary & {
  positions: (GamePosition & { sortOrder: number })[];
  kifuText?: string;
  sourceInputText?: string;
};

export type TagStat = {
  tag: string;
  count: number;
  percentage: number;
};

export type StrategyStat = {
  strategy: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
};

export type StudyAllocation = {
  item: string;
  percentage: number;
  dailyCount?: number;
  reason: string;
};

export const VENUE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: "shogi_wars_10min", label: "将棋ウォーズ 10分切れ負け" },
  { value: "shogi_wars_sprint", label: "将棋ウォーズ スプリント" },
  { value: "kion", label: "棋の音" },
  { value: "other", label: "その他" },
];

export const RESULT_LABELS: Record<GameResult, string> = {
  win: "勝ち",
  loss: "負け",
  draw: "引き分け",
};
