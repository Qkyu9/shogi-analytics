# Supabase + Clerk 本番接続手順

コード側の実装は完了しています。**以下の手順はあなたがブラウザ上で行う作業**です（約20〜30分）。

---

## 全体の流れ

```
① Supabase プロジェクト作成 → SQL実行
② Clerk アプリ作成 → ログイン方法設定
③ Vercel に環境変数を追加 → 再デプロイ
④ 本番URLでログイン → 記録がクラウドに保存されることを確認
```

---

## 1. Supabase の設定

### 1-1. プロジェクト作成（未作成の場合）

1. https://supabase.com/dashboard にログイン
2. **New project** をクリック
3. 名前例: `shogi-analytics`、リージョンは **Tokyo (ap-northeast-1)** 推奨
4. データベースパスワードを設定して作成（数分待つ）

### 1-2. SQL を実行（テーブル作成）

1. 左メニュー **SQL Editor** → **New query**
2. 次の3ファイルの内容を **この順番で** 貼り付けて **Run**:
   - `supabase/migrations/20250203_init_users.sql`
   - `supabase/migrations/20250608_game_records.sql`
   - `supabase/migrations/20250608_source_input_text.sql`（既存DBへの追加分。新規作成時も実行して問題ありません）
   - `supabase/migrations/20250608_fix_bare_migi_gyoku.sql`（既存記録の単独「右玉」→「雁木右玉」。既存データがある場合のみ）
   - `supabase/migrations/20250608_opponent_rank.sql`（相手の段位・級位列の追加。既存DBにも実行）
   - `supabase/migrations/20250608_handicap.sql`（手合・先手/後手列の追加。既存DBにも実行）
   - `supabase/migrations/20250608_user_owned_books.sql`（購入済み棋書の登録テーブル。既存DBにも実行）
   - `supabase/migrations/20250608_user_owned_books_v2.sql`（書名・カテゴリ列の追加。v1実行済みDBにも実行）
3. 左メニュー **Table Editor** で `users` と `game_records` ができているか確認

### 1-3. API キーを控える

**Project Settings** → **API** から以下をコピー:

| 名前 | どこにあるか |
|------|-------------|
| Project URL | Project URL |
| Publishable key | `anon` / publishable key（`eyJ...` で始まる長い文字列） |
| Service role key | `service_role`（**秘密**。公開しない） |

---

## 2. Clerk の設定

### 2-1. アプリケーション作成（未作成の場合）

1. https://dashboard.clerk.com にログイン
2. **Create application** → 名前例: `将棋 Analytics`
3. ログイン方法を選ぶ（おすすめ: **Google** または **Email**）

### 2-2. 本番URLを許可

**Configure** → **Domains**（または Paths）で、Vercel の本番URLを追加:

- 例: `https://shogi-analytics-xxxx.vercel.app`

**Paths** で以下が有効か確認:

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/`
- After sign-up: `/`

### 2-3. API キーを控える

**API Keys** から:

| 名前 | 種類 |
|------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key（`pk_live_...` または `pk_test_...`） |
| `CLERK_SECRET_KEY` | Secret key（`sk_live_...` または `sk_test_...`） |

本番紹介用なら **Production** インスタンスのキーを使ってください。

---

## 3. Vercel に環境変数を追加

Vercel ダッシュボード → プロジェクト `shogi-analytics` → **Settings** → **Environment Variables**

以下を **Production** に追加:

| 変数名 | 値 |
|--------|-----|
| `OPENAI_API_KEY` | （既に設定済みならそのまま） |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk の Publishable key |
| `CLERK_SECRET_KEY` | Clerk の Secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase Publishable（anon）key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service role key |

追加後 **Deployments** → 最新デプロイの **⋯** → **Redeploy**（環境変数を反映）

---

## 4. 動作確認

1. iPhone Safari で本番URLを開く（ホーム画面アイコンからでも可）
2. ログイン画面が出る → Google またはメールでログイン
3. ホーム → 記録一覧にデータが表示される
4. 新しく「対局を記録する」→ 保存
5. Supabase ダッシュボード → **Table Editor** → `game_records` に行が増えているか確認

### 以前 iPhone に保存していた記録について

初回ログイン時、端末内（localStorage）に残っていた記録は **自動で Supabase に移行** されます。移行後はクラウドが正本になります。

---

## 5. ローカル開発用（任意）

`.env.local` に上記と同じ変数を設定してください。`.env.local.example` を参照。

```bash
npm run dev
```

http://localhost:3000 を Clerk の許可ドメインに追加する必要がある場合があります（Development インスタンスは通常 `localhost` 対応済み）。

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| ログイン後に真っ白 / エラー | Vercel の Clerk キーが Production か確認。Redeploy |
| 「記録の保存に失敗」 | Supabase の SQL が実行済みか、`SUPABASE_SERVICE_ROLE_KEY` が正しいか確認 |
| ログイン画面が出ない | 古いキャッシュ。Safari でサイトデータを削除して再アクセス |
| 別端末で記録が見えない | 同じ Clerk アカウントでログインしているか確認 |
