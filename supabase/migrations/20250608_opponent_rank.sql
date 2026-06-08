-- 相手の段位・級位（音声ガイドの2番目に対応）

alter table public.game_records
  add column if not exists opponent_rank text not null default '';
