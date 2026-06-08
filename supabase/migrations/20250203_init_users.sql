-- ============================================
-- Migration: 初期スキーマ作成 (Clerk統合版)
-- Purpose: ユーザーテーブルの作成とRLS設定
-- ============================================

-- テーブル作成
create table public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text not null,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
comment on table public.users is 'アプリケーションのユーザー情報を管理 (Clerkと同期)';

-- RLS の有効化
alter table public.users enable row level security;

-- RLS ポリシー: SELECT (自分のデータのみ参照可能)
create policy "users_select_own_data" on public.users
  for select to authenticated
  using (clerk_user_id = auth.jwt() ->> 'sub');

-- RLS ポリシー: INSERT (自分のデータのみ作成可能 - 基本はService Roleで行うが念のため)
create policy "users_insert_own_data" on public.users
  for insert to authenticated
  with check (clerk_user_id = auth.jwt() ->> 'sub');

-- RLS ポリシー: UPDATE (自分のデータのみ更新可能)
create policy "users_update_own_data" on public.users
  for update to authenticated
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

-- インデックスの作成
create index idx_users_clerk_user_id on public.users(clerk_user_id);
