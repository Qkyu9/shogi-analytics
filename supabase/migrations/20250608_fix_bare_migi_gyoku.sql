-- 既存記録: 単独の「右玉」「右翼」を雁木右玉に統一
-- （角換わり右玉・対振り右玉・雁木右玉は変更しない）

update game_records
set
  my_strategy = '雁木右玉',
  updated_at = now()
where
  trim(my_strategy) in ('右玉', '右翼')
  or trim(my_strategy) ~ '^右玉[でをは]?$'
  or trim(my_strategy) ~ '^右翼[でをは]?$';
