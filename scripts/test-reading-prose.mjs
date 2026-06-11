import { buildCompactAim } from "../app/lib/kifu-reading-prose.ts";

const reading =
  "△５一角(33) ▲８二馬(73) △同 飛(81) ▲同 と(93) △９七歩打";

const stored =
  "52手目では玉を左に寄せたが、この局面で手に入れた角を使い、相手の持ち駒を制する展開もあった。";

console.log(buildCompactAim("△５一角", reading, stored));
