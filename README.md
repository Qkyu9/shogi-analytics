# 将棋 Analytics — デモ実装

対局直後の音声振り返り → 弱点分析 → 学習メニュー提案（個人用 MVP）

## 技術スタック

- Next.js 15（App Router）
- TypeScript / Tailwind CSS v4
- OpenAI（文字起こし・将棋用語補正・要約）
- Vercel ホスティング / PWA

## ローカル起動

```bash
npm install
cp .env.local.example .env.local
# OPENAI_API_KEY を設定
npm run dev
```

http://localhost:3000

## Vercel デプロイ

1. GitHub に push
2. Vercel で Import（Root: このフォルダ）
3. 環境変数 `OPENAI_API_KEY` を Production に設定
4. Deploy

## iPhone に追加（PWA）

1. Safari で本番 URL を開く
2. 共有ボタン →「ホーム画面に追加」
