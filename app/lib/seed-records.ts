import type { GameRecordDetail } from "./types";

/**
 * 初回アクセス時に localStorage が空なら投入する記録。
 * ダミーサンプルは含めない。音声入力で作成・確認した実記録1件のみ。
 */
export const SEED_RECORDS: GameRecordDetail[] = [
  {
    id: "rec-voice-20260608",
    playedAt: "2026-06-08T12:00:00+09:00",
    venueType: "shogi_wars_10min",
    venueLabel: "将棋ウォーズ 10分切れ負け",
    result: "win",
    myStrategy: "角換わり右玉",
    opponentRank: "会館初段",
    opponentStrategy: "角換わりからの矢倉囲い",
    tags: ["中盤の読み（攻めるか受けるか）"],
    positionCount: 3,
    positions: [
      {
        sortOrder: 0,
        sceneDescription:
          "右玉の形を整え、8筋に飛車を回し8五桂と攻めた。相手は桂を跳ねて飛車先を止め、角打ちで反撃を狙う流れになった。",
        defeatCause:
          "飛車が相手の成り駒に閉じ込められる手があり得た。打ち込み駒の働きを優先したが、自陣の飛車を先に出して閉じ込めを避ける方を優先すべきだった。玉の硬さの差を見て判断が必要。",
        correctMove:
          "自陣の飛車を先に前に出し、成り駒に閉じ込められる前に対処する。",
        lesson:
          "攻め駒の働きと自陣飛車の安全、どちらを優先するかは玉の硬さの差で決める。",
      },
      {
        sortOrder: 1,
        sceneDescription:
          "矢倉崩しに成功し、中央の駒を攻め立てて相手の硬い囲いに攻めを見せた。",
        defeatCause:
          "失敗や敗因はないが、飛車の見捨ては重要な含みのある手順だった。",
        correctMove: "飛車見捨ては正しい。矢倉崩しの手順どおり。",
        lesson:
          "矢倉崩しを正確に覚えれば、飛車を見捨てるタイミングを選べる。",
      },
      {
        sortOrder: 2,
        sceneDescription: "矢倉崩しを間違えた場合のリスク。",
        defeatCause:
          "手順を外すと飛車を見捨てる流れになり、飛車を取られ一気に玉が寄られる。",
        correctMove:
          "矢倉崩しの正確な手順を覚え、見捨てタイミングを外さない。",
        lesson: "崩しを外した瞬間、玉寄せの危険が一気に高まる。",
      },
    ],
  },
];

/** 旧モックデータのID（削除対象） */
export const LEGACY_MOCK_RECORD_IDS = ["rec-001", "rec-002", "rec-003"];
