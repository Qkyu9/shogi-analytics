-- 将棋 Analytics: 対局記録テーブル

create table public.game_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  played_at timestamptz not null,
  venue_type text not null,
  result text not null check (result in ('win', 'loss', 'draw')),
  my_strategy text not null default '',
  opponent_strategy text not null default '',
  tags text[] not null default '{}',
  kifu_text text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_game_records_user_played_at
  on public.game_records(user_id, played_at desc);

create table public.game_positions (
  id uuid primary key default gen_random_uuid(),
  game_record_id uuid not null references public.game_records(id) on delete cascade,
  sort_order integer not null default 0,
  scene_description text not null default '',
  defeat_cause text not null default '',
  correct_move text not null default '',
  lesson text not null default ''
);

create index idx_game_positions_record_sort
  on public.game_positions(game_record_id, sort_order);

alter table public.game_records enable row level security;
alter table public.game_positions enable row level security;

-- MVP: Server API は Service Role を使用。RLS は将来の直接アクセス用に有効化のみ。
