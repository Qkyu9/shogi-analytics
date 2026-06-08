-- 敗因タグ「中盤の攻受判断ミス」等を「中盤の読み（攻めるか受けるか）」に統一

update public.game_records
set
  tags = (
    select coalesce(
      array_agg(distinct case
        when t in (
          '中盤の攻受判断ミス',
          '中盤の攻受判断',
          '中盤の攻防判断ミス',
          '中盤の攻防判断'
        ) then '中盤の読み（攻めるか受けるか）'
        else t
      end),
      '{}'::text[]
    )
    from unnest(tags) as t
  ),
  updated_at = now()
where tags && array[
  '中盤の攻受判断ミス',
  '中盤の攻受判断',
  '中盤の攻防判断ミス',
  '中盤の攻防判断'
]::text[];
