import {
  buildReadingBasedIntent,
  summarizeReadingAsProse,
} from "../app/lib/kifu-reading-prose.ts";

const reading =
  "△５一角(33) ▲８二馬(73) △同 飛(81) ▲同 と(93) △９七歩打";

console.log("summary:", summarizeReadingAsProse(reading, "△５一角"));
console.log(
  "intent:",
  buildReadingBasedIntent(52, "△３一玉", "△５一角", reading)
);
