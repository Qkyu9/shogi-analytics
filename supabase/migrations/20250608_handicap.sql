-- 手合・手番（先手/後手）列の追加

alter table public.game_records
  add column if not exists handicap text not null default '',
  add column if not exists player_side text
    check (player_side is null or player_side in ('sente', 'gote'));
