-- 棋神アナリティクスから生成した示唆（端的なまとめ・要所）を JSON で保存
alter table public.game_records
  add column if not exists kishin_insight jsonb;
