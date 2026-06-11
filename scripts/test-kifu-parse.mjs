import { parseNumberedMoveLine } from "../app/lib/kifu-line-parse.ts";
import { parseKifuEngineFacts } from "../app/lib/kifu-engine-facts.ts";
import {
  resolveCandidateForTurningPoint,
  resolveReadingForTurningPoint,
} from "../app/lib/kifu-candidate-resolver.ts";

for (const line of [
  "52 ３一玉(41) ( 0:04/00:02:46)",
  "52手　３一玉(41)",
  "52手 ３一玉(41)",
  "52.３一玉(41)",
]) {
  console.log(JSON.stringify(line), "=>", parseNumberedMoveLine(line));
}

const kifu2 = `Engine hisui Version 202605
候補3
評価値 -1036
読み筋 △７一飛(81) ▲８二馬(73) △７四飛(71)
52 ３一玉(41) ( 0:04/00:02:46)
候補1
評価値 -706
読み筋 ▲８二と(93) △９七歩打
`;

const kifu3 = `候補3
評価値 -1036
読み筋 △７一飛(81)
52手　３一玉(41)
`;

const kifu4 = `候補3
評価値 -1036
読み筋
△７一飛(81) ▲８二馬(73)
52 ３一玉(41)
`;

const kifu5 = `** Engine hisui Version 202605 候補3 深さ 13/25 ノード数 65923 評価値 -1036 読み筋 △７一飛(81) ▲８二馬(73) △７四飛(71)
  52 ３一玉(41)    ( 0:04/00:02:46)
`;

for (const [name, kifu] of [
  ["direct52", kifu2],
  ["52手", kifu3],
  ["multiline-reading", kifu4],
  ["one-line-engine", kifu5],
]) {
  const facts = parseKifuEngineFacts(kifu);
  console.log(`--- ${name} ---`);
  console.log("52 move:", facts.moveByNumber.get(52));
  console.log("52 cands:", facts.candidatesByNumber.get(52));
  console.log("52 reading:", facts.readingLineByNumber.get(52));
  console.log(
    "resolve:",
    resolveCandidateForTurningPoint(52, kifu, facts.moveByNumber.get(52) ?? "")
  );
}
