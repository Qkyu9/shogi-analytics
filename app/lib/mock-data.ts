import type {
  GameRecordDetail,
  GameRecordDraft,
  GameRecordSummary,
  StudyAllocation,
  TagStat,
} from "./types";

export const mockTagSuggestions = [
  "中盤の攻受判断ミス",
  "中盤の勝ち切り不足",
  "寄せの読み漏れ",
  "想定外の手への対応不足",
  "序盤の手筋ミス",
  "時間切れ",
];

export const mockRecords: GameRecordSummary[] = [
  {
    id: "rec-001",
    playedAt: "2025-06-08T21:30:00+09:00",
    venueType: "shogi_wars_10min",
    venueLabel: "将棋ウォーズ 10分切れ負け",
    result: "loss",
    myStrategy: "右玉",
    opponentStrategy: "雁木",
    tags: ["中盤の攻受判断ミス"],
    positionCount: 2,
  },
  {
    id: "rec-002",
    playedAt: "2025-06-07T19:00:00+09:00",
    venueType: "kion",
    venueLabel: "棋の音",
    result: "loss",
    myStrategy: "右玉",
    opponentStrategy: "美濃",
    tags: ["寄せの読み漏れ", "想定外の手への対応不足"],
    positionCount: 1,
  },
  {
    id: "rec-003",
    playedAt: "2025-06-06T22:15:00+09:00",
    venueType: "shogi_wars_sprint",
    venueLabel: "将棋ウォーズ スプリント",
    result: "loss",
    myStrategy: "居飛車",
    opponentStrategy: "振り飛車",
    tags: ["中盤の勝ち切り不足"],
    positionCount: 1,
  },
];

export const mockRecordDetails: Record<string, GameRecordDetail> = {
  "rec-001": {
    ...mockRecords[0],
    positions: [
      {
        sortOrder: 0,
        sceneDescription:
          "中盤、右玉で組んでいたが相手の雁木攻めに対して受けに回った局面。7筋付近で相手の桂が飛び込み、守りの金（4二）に利きをつけてきた。",
        defeatCause:
          "桂で取る手を選んでしまった。一見攻め駒を取れて有利に見えたが、金が取られて守りの要が失われ、その後の攻めに耐えきれなくなった。",
        correctMove:
          "▲4二金。金を逃げることで桂の利きを外し、右玉の守り骨格を維持できる。角の利きも残して反撃の余地を確保できる。",
        lesson: "受けの将棋では「駒得」より先に、守りの要となる駒の安全を優先する。",
      },
      {
        sortOrder: 1,
        sceneDescription: "終盤の寄せ局面",
        defeatCause: "読みが一段浅かった",
        correctMove: "▲5二玉",
        lesson: "王の逃げ道を先に確認する",
      },
    ],
    kifuText: "先手：渡辺\n後手：対戦相手\n手数----指手---------",
  },
  "rec-002": {
    ...mockRecords[1],
    positions: [
      {
        sortOrder: 0,
        sceneDescription: "相手の想定外の捨て駒に弱かった",
        defeatCause: "読みの幅が狭く、捨て駒を見落とした",
        correctMove: "△7六歩不成",
        lesson: "相手の捨て駒候補を事前に洗い出す",
      },
    ],
  },
  "rec-003": {
    ...mockRecords[2],
    positions: [
      {
        sortOrder: 0,
        sceneDescription: "優勢から逆転された中盤",
        defeatCause: "勝ち切りの一手が甘かった",
        correctMove: "▲7六歩成",
        lesson: "優勢時こそ手を緩めない",
      },
    ],
  },
};

export const mockDraftFromVoice: GameRecordDraft = {
  playedAt: new Date().toISOString(),
  venueType: "shogi_wars_10min",
  result: "loss",
  myStrategy: "右玉",
  opponentStrategy: "雁木",
  positions: [
    {
      sceneDescription:
        "中盤、右玉で組んでいたが相手の雁木攻めに対して受けに回った局面。7筋付近で相手の桂が飛び込み、守りの金（4二）に利きをつけてきた。ここで形勢は互角に近く、金を取られると右玉の守りの要が崩れる危険があった。",
      defeatCause:
        "桂で取る手（▲4二桂）を選んでしまった。一見、攻め駒を取れて有利に見えたが、実際には金が取られて守りの要が失われ、その後の攻めに耐えきれなくなった。相手は金を取ることで守りを崩し、逆に攻め込む狙いがあった。",
      correctMove:
        "▲4二金。金を逃げることで桂の利きを外し、右玉の守り骨格を維持できる。桂を取るより、守りの駒を先に安全にすることが優先で、角の利きも残して反撃の余地を確保できる。",
      lesson:
        "受けの将棋では「駒得」より先に、守りの要となる駒の安全と利きの整理を優先する。",
    },
  ],
  tags: ["中盤の攻受判断ミス"],
};

export const mockWeaknessRanking: TagStat[] = [
  { tag: "中盤の攻受判断ミス", count: 6, percentage: 40 },
  { tag: "寄せの読み漏れ", count: 4, percentage: 27 },
  { tag: "想定外の手への対応不足", count: 2, percentage: 13 },
  { tag: "中盤の勝ち切り不足", count: 2, percentage: 13 },
];

export const mockStudyMenu: StudyAllocation[] = [
  {
    item: "三手詰め",
    percentage: 20,
    dailyCount: 10,
    reason: "終盤の短い読みを維持するため",
  },
  {
    item: "五手詰め",
    percentage: 25,
    dailyCount: 5,
    reason: "#寄せの読み漏れ が直近で多い。終盤寄せの読み筋強化で寄せ負けを減らす",
  },
  {
    item: "中盤手筋",
    percentage: 25,
    reason:
      "#中盤の攻受判断ミス が最多。攻めと受けの選択練習で中盤の判断精度を上げる",
  },
  {
    item: "実戦",
    percentage: 30,
    reason:
      "実践を好む傾向を活かしつつ、対局直後の振り返りとセットで弱点を定着させる",
  },
];

export const MOCK_TRANSCRIPT =
  "今日は将棋ウォーズで10分切れ負け。自分は右玉、相手は雁木。中盤で桂に守りの金を狙われて、銀で取る手を選んでしまった。金を逃げるべきだった。";
