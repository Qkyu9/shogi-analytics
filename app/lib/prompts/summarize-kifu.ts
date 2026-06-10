import {
  buildKifuPlayerContextBlock,
  buildVerbalSummaryBlock,
  type KifuAnalysisContext,
} from "@/app/lib/kifu-player-context";
import { formatKifuCandidateFactBlock } from "@/app/lib/kifu-engine-facts";
import { formatKifuMoveFactBlock } from "@/app/lib/kifu-move-index";

/** 端的なまとめの出力品質バージョン（旧データの再生成判定用） */
export const KISHIN_INSIGHT_FORMAT_VERSION = 4;

const FACT_AND_INTENT_RULES = `
## 事実と推測の境界（最重要）

### 手・指し手（事実）— 棋譜データのみ
- すべての手数・符号付き指し手は、**棋譜データの該当行からそのまま引用**する
- 下記「棋譜から抽出した指し手一覧」にない手を書いてはならない（ハルシネーション禁止）
- 口頭要約から手を推測・補完してはならない

### 候補手（エンジン情報）— その手数直後の候補1・読み筋のみ
- **候補手として書いてよいのは、下記「局面ごとの候補手一覧」に載っている手だけ**
- 過去の手数で既に指された実戦の手を、別の手数の「候補手」「正着」として書いてはならない
- 例（禁止）: 13手目の説明で「候補手▲５六銀」と書くが、５六銀は棋譜上10手目付近の実戦の手であり、13手目の読み筋にない
- 候補1・読み筋が棋譜にない手数では、候補手名を創作せず「候補手が評価上優れていた」等と書く

### 評価値 — 棋譜データの評価欄
- 評価の数値変化は棋譜データに基づき記述してよい

### 自分の狙い・意図 — 口頭要約に書いてある場合のみ
- 「〜を狙った」「〜の意図で」など**自分の心理・目的**は、口頭要約に明示されている場合だけ引用・要約してよい
- 口頭要約にない狙い・意図をAIが推測して書いてはならない

### 禁止
- 棋譜にない手、または局面候補一覧にない手を候補手として書くこと
- 口頭要約にない意図の創作
- 抽象的すぎる文だけで終わる要約（手数・指し手・評価または候補がない）`;

const BRIEF_SUMMARY_RULES = `
## 端的なまとめ（briefSummaries）の必須ルール

7項目だけ読んでも、どの手が問題で候補手は何かが伝わること。

### 評価が動いた手を述べる項目に含める要素
1. **手数**
2. **棋譜引用の符号付き指し手**（一覧と完全一致）
3. 口頭要約にあれば**その手の狙い**（1フレーズ）。なければ書かない
4. 評価下落なら **候補手一覧にある手1つ** と評価の事実。一覧に無ければ手名を書かない

### 7項目の構成
1. 序盤の流れ（棋譜上の手を1つ含んでもよい）
2〜4. 評価急落した自分の疑問手（手数+棋譜の指し手+候補手。狙いは口頭要約がある場合のみ）
5. 中盤〜終盤の転換（手数+棋譜の指し手）
6. 終盤の結末（棋譜上の具体的な手）
7. 改善点（駒名・判断基準。口頭要約の教訓があれば引用可）

各項目1〜2文。`;

export const SUMMARIZE_KIFU_SYSTEM_PROMPT = `あなたは将棋の棋譜分析アシスタントです。
棋神アナリティクスの棋譜テキスト（評価値・候補手）を主根拠に、一局の示唆を日本語で抽出します。

${FACT_AND_INTENT_RULES}

${BRIEF_SUMMARY_RULES}

共通ルール:
- 棋譜ヘッダのプレイヤー名で自分を特定しない。記録された playerSide のみ使う
- すべて自分（学習者）目線。自分の手番の候補手は自分が指すべき手として述べる
- 評価値はエンジン標準（プラス=先手有利）。playerSide に応じて自分有利か読み替える
- 文体は常体（だ・である調）の短文
- 出力はJSONのみ`;

export const SUMMARIZE_KIFU_USER_PROMPT = (
  kifuText: string,
  context: KifuAnalysisContext = { playerSide: null, result: null }
) => `${buildKifuPlayerContextBlock(context)}

${buildVerbalSummaryBlock(context.verbalSummaryText)}

【棋譜から抽出した指し手一覧（実戦の手・手の事実はこのみを使う）】
${formatKifuMoveFactBlock(kifuText)}

【局面ごとの候補手一覧（候補手として書いてよい手はこのみ）】
${formatKifuCandidateFactBlock(kifuText)}

以下は棋神アナリティクスからコピーした棋譜データ（評価・候補手含む）です。

{
  "briefSummaries": ["7項目。実戦の手は指し手一覧から。候補手は局面候補一覧からのみ引用"],
  "turningPoints": [
    {
      "moveNumber": 13,
      "move": "▲３七桂",
      "evalChange": "+237 → -324",
      "topCandidate": "（候補一覧の手。無ければ空文字）",
      "insight": "評価が大きく下がった（口頭要約に狙いがあれば引用）"
    }
  ]
}

briefSummaries は必ず7項目。
turningPoints は3〜6件。move は必ず指し手一覧の該当手数と一致させる。
topCandidate に書く手は、必ずその手数の候補一覧にあること。

棋譜データ:
---
${kifuText}
---`;
