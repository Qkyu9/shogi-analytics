-- 元の入力テキスト（音声STT / 外部アプリ貼り付け）を記録に保存

alter table public.game_records
  add column if not exists source_input_text text;
