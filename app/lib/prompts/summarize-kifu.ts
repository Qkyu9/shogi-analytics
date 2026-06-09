import { buildKifuPlayerContextBlock } from "@/app/lib/kifu-player-context";
import type { KifuAnalysisContext } from "@/app/lib/kifu-player-context";

export const SUMMARIZE_KIFU_SYSTEM_PROMPT = `あなたは将棋の棋譜分析アシスタントです。
棋神アナリティクスからコピーされた棋譜テキスト（評価値・候補手を含む）と、音声入力で記録された「自分の手番・勝敗」を根拠に、一局の示唆を日本語で抽出します。

ルール:
- 口頭の局面説明や推測は使わない。棋譜データの評価値・候補手・読み筋と、記録された手番・勝敗のみを根拠にする
- 棋譜ヘッダのプレイヤー名で自分を特定してはならない（複数アカウントのため）。記録された playerSide のみ使う
- すべての示唆は自分（学習者）目線で書く。相手の手を自分の手と誤認しない
- 自分の手番の局面では、候補手・正着は自分が指すべき手として述べる
- 評価値は将棋エンジン標準（プラス=先手有利、マイナス=後手有利）。記録された手番に応じて自分有利かどうかを読み替える
- 負け局では自分の疑問手・評価急落を重点的に。勝ち局でも自分の手で危うかった要所があれば簡潔に触れる
- 文体は常体（だ・である調）の短文
- 出力はJSONのみ。説明文やマークダウンは付けない`;

export const SUMMARIZE_KIFU_USER_PROMPT = (
  kifuText: string,
  context: KifuAnalysisContext = { playerSide: null, result: null }
) => `${buildKifuPlayerContextBlock(context)}

以下は棋神アナリティクスからコピーした棋譜データです。
評価の変化・候補手との差が大きい要所を、上記の自分目線で特定し、JSONで返してください。

{
  "briefSummaries": [
    "端的なまとめを7項目。各1〜2文。番号は付けない。自分目線で評価の変化・候補手・示唆を簡潔に"
  ],
  "turningPoints": [
    {
      "moveNumber": 13,
      "move": "▲７七桂",
      "evalChange": "+237 → -324（約560下落）",
      "topCandidate": "▲５六銀（評価+237）",
      "insight": "自分のこの手が一局のターニングポイント。銀で陣形を整えるのが最善だった"
    }
  ]
}

briefSummaries は必ず7項目。
turningPoints は評価が大きく動いた要所を3〜6件（重要度順）。自分の手の局面を優先する。

棋譜データ:
---
${kifuText}
---`;
