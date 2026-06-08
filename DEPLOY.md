# デプロイ手順（Prompt_Refine と同じ Vercel 工程）

## 完了済み（自動）

- GitHub: https://github.com/Qkyu9/shogi-analytics
- `npm run build` 成功確認済み

## Supabase + Clerk を接続する場合

記録をクラウドに保存するには、**[CONNECT.md](./CONNECT.md)** の手順に従ってください（約20〜30分）。

---

## あなたが行う手順（約10分）

### 1. Vercel にインポート

1. https://vercel.com/new/import?repository-url=https://github.com/Qkyu9/shogi-analytics を開く
2. GitHub アカウントでログイン（未連携なら連携）
3. リポジトリ `shogi-analytics` を Import
4. Framework: **Next.js**（自動検出）
5. Root Directory: **./**（そのまま）
6. **Environment Variables** に追加:
   - Name: `OPENAI_API_KEY`
   - Value: `.env.local` と同じキー
7. **Deploy** をクリック

### 2. デプロイ確認

- 完了後 URL が表示される（例: `https://shogi-analytics-xxx.vercel.app`）
- `/records/new` を開き、マイク許可が出るか確認

### 3. iPhone にホーム画面追加（PWA）

1. iPhone の **Safari** で本番 URL を開く
2. 画面下の **共有** ボタン（□↑）
3. **ホーム画面に追加**
4. 名前「将棋 Analytics」→ **追加**

※ Chrome ではなく Safari を使うこと。

## ローカル確認（デプロイ前の最終チェック）

```bash
npm run dev
```

http://localhost:3000/records/new →「文字起こしから要約を作る」
