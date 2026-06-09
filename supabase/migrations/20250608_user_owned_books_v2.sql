-- 購入済み棋書: 書名入力・カテゴリ対応（v2）

alter table public.user_owned_books
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists study_action text not null default '',
  add column if not exists auto_classified boolean not null default true;

alter table public.user_owned_books
  alter column book_id drop not null;

alter table public.user_owned_books
  drop constraint if exists user_owned_books_user_id_book_id_key;

create unique index if not exists idx_user_owned_books_user_title
  on public.user_owned_books (user_id, title)
  where title is not null and title <> '';

-- 旧 book_id 形式からの移行（チェックリスト時代のデータ）
update public.user_owned_books
set title = '五手詰ハンドブック', category = 'tsumeshogi', study_action = '詰め将棋を解く（1日5〜10問）'
where book_id = 'gote-handbook' and (title is null or title = '');

update public.user_owned_books
set title = '寄せの手筋200', category = 'endgame', study_action = '該当する寄せ手筋の問題を読む'
where book_id = 'yose-200' and (title is null or title = '');
