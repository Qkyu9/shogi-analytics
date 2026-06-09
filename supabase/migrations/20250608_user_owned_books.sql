-- ユーザーが購入済みとして登録した棋書

create table public.user_owned_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id text not null,
  created_at timestamptz default now() not null,
  unique (user_id, book_id)
);

create index idx_user_owned_books_user_id
  on public.user_owned_books(user_id);

alter table public.user_owned_books enable row level security;
