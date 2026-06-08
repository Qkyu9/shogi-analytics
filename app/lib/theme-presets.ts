export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  mood: string;
  vars: Record<string, string>;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "cream-gold",
    name: "A. クリーム＆ゴールド",
    description:
      "明るいクリーム色の背景に、落ち着いたゴールドを差し色にしたパターンです。",
    mood: "落ち着き・上品さ",
    vars: {
      "--color-bg": "#faf7f2",
      "--color-bg-sub": "#f3ede4",
      "--color-surface": "#ffffff",
      "--color-surface-hover": "#f7f3ec",
      "--color-text": "#3a3530",
      "--color-text-sub": "#7d766c",
      "--color-primary": "#b8860b",
      "--color-primary-hover": "#c9922a",
      "--color-danger": "#c75c5c",
      "--color-success": "#4d8a62",
      "--color-tag-bg": "#f5efe4",
      "--color-tag-text": "#9a7222",
      "--color-border": "#e5ddd0",
    },
  },
  {
    id: "warm-natural",
    name: "B. ウォームナチュラル",
    description:
      "リネンや木の温もりを感じるベージュ系。アクセントはコッパーブラウンです。",
    mood: "自然・やさしさ",
    vars: {
      "--color-bg": "#f6f1ea",
      "--color-bg-sub": "#ebe4d9",
      "--color-surface": "#fffdf8",
      "--color-surface-hover": "#f3ece2",
      "--color-text": "#2e2a26",
      "--color-text-sub": "#6f6860",
      "--color-primary": "#9a6842",
      "--color-primary-hover": "#ab784f",
      "--color-danger": "#b85a5a",
      "--color-success": "#5a8468",
      "--color-tag-bg": "#efe8dc",
      "--color-tag-text": "#8b5e3c",
      "--color-border": "#ddd4c8",
    },
  },
  {
    id: "stone-amber",
    name: "C. ストーン＆アンバー",
    description:
      "温かみのあるストーングレーに、アンバー色をポイントで入れたパターンです。",
    mood: "シンプル・洗練",
    vars: {
      "--color-bg": "#f2f0ec",
      "--color-bg-sub": "#e8e5df",
      "--color-surface": "#fafaf8",
      "--color-surface-hover": "#eeebe5",
      "--color-text": "#33302c",
      "--color-text-sub": "#6e6a63",
      "--color-primary": "#c48f1a",
      "--color-primary-hover": "#d4a030",
      "--color-danger": "#c06060",
      "--color-success": "#4f8a66",
      "--color-tag-bg": "#ebe7df",
      "--color-tag-text": "#a67c1a",
      "--color-border": "#d9d5cd",
    },
  },
];
