-- Исправление VIEW для корректной работы с foreign key constraints
-- Устраняет дублирование и обеспечивает правильную логику
-- Создаётся: 2025-09-11

-- Пересоздаём schema для API
create schema if not exists api_v1;

-- 1. ИСПРАВЛЕННЫЙ Teacher Leaderboard View
-- Источник истины: profiles (показываем ВСЕХ учителей)
-- LEFT JOIN с остальными таблицами для получения метрик и рейтингов
create or replace view api_v1.vw_leaderboard_teacher_overall_all as
select
  p.user_id as teacher_id,
  coalesce(p.full_name, p.email) as name,
  p.category,
  p.branch_id,
  b.name as branch_name,
  tm.return_pct,
  tm.trial_pct,
  coalesce(cs.score, 0) as score,
  coalesce(cs.rank, 999) as rank,  -- Учителя без рейтинга идут в конец
  coalesce(cs.updated_at, p.created_at) as updated_at,
  -- Дельты считаем только если есть и текущий рейтинг, и предыдущий снимок
  case 
    when cs.rank is not null and s.rank is not null then (s.rank - cs.rank)  -- Положительная дельта = улучшение
    else null
  end as delta_rank,
  case 
    when cs.score is not null and s.score is not null then (cs.score - s.score)  -- Положительная дельта = рост баллов
    else null
  end as delta_score,
  null::text as prize  -- Призы для учителей пока не используются
from public.profiles p
left join public.branch b on b.id = p.branch_id
left join public.teacher_metrics tm on tm.teacher_id = p.user_id
left join public.current_scores cs on cs.teacher_id = p.user_id 
  and cs.scope = 'teacher_overall' 
  and cs.context = 'all'
left join lateral (
  -- Получаем последний снимок для этого учителя
  select s2.rank, s2.score
  from public.snapshots s2
  where s2.scope = 'teacher_overall' 
    and s2.context = 'all' 
    and s2.teacher_id = p.user_id
  order by s2.created_at desc
  limit 1
) s on true
where p.role = 'Teacher'  -- Показываем только преподавателей
order by 
  case when cs.rank is null then 1 else 0 end,  -- Сначала с рейтингом
  coalesce(cs.rank, 999) asc,                   -- Потом по рангу
  p.full_name asc;                              -- При равенстве рангов - по имени

-- 2. ИСПРАВЛЕННЫЙ Branch Leaderboard View  
-- Источник истины: branch (показываем все филиалы)
-- LEFT JOIN с current_scores для получения рейтингов
create or replace view api_v1.vw_leaderboard_branch_overall_all as
select
  b.id as branch_id,
  b.name as branch_name,
  coalesce(cs.score, 0) as score,
  coalesce(cs.rank, 999) as rank,  -- Филиалы без рейтинга идут в конец
  coalesce(cs.updated_at, b.created_at) as updated_at,
  -- Дельты для филиалов
  case 
    when cs.rank is not null and s.rank is not null then (s.rank - cs.rank)  -- Положительная дельта = улучшение
    else null
  end as delta_rank,
  case 
    when cs.score is not null and s.score is not null then (cs.score - s.score)  -- Положительная дельта = рост баллов
    else null
  end as delta_score,
  -- Призы для топ-5 филиалов
  case coalesce(cs.rank, 999)
    when 1 then '🏆 Grand Prize'
    when 2 then '🥈 Second Place'
    when 3 then '🥉 Third Place'
    when 4 then '🎖️ Fourth Place'
    when 5 then '🏅 Fifth Place'
    else null
  end as prize
from public.branch b
left join public.current_scores cs on cs.branch_id = b.id 
  and cs.scope = 'branch_overall' 
  and cs.context = 'all'
left join lateral (
  -- Получаем последний снимок для этого филиала
  select s2.rank, s2.score
  from public.snapshots s2
  where s2.scope = 'branch_overall' 
    and s2.context = 'all' 
    and s2.branch_id = b.id
  order by s2.created_at desc
  limit 1
) s on true
order by 
  case when cs.rank is null then 1 else 0 end,  -- Сначала с рейтингом
  coalesce(cs.rank, 999) asc,                   -- Потом по рангу
  b.name asc;                                   -- При равенстве рангов - по названию

-- 3. Вспомогательная VIEW для отладки - показывает состояние связей
create or replace view api_v1.vw_data_integrity_check as
select
  'profiles' as table_name,
  p.user_id as record_id,
  p.full_name as description,
  case 
    when p.branch_id is not null and b.id is null then '❌ Invalid branch_id'
    when p.role = 'Teacher' and tm.teacher_id is null then '⚠️ Missing teacher_metrics'
    when p.role = 'Teacher' and cs.teacher_id is null then '⚠️ Missing current_scores'
    else '✅ OK'
  end as status
from public.profiles p
left join public.branch b on b.id = p.branch_id
left join public.teacher_metrics tm on tm.teacher_id = p.user_id
left join public.current_scores cs on cs.teacher_id = p.user_id 
  and cs.scope = 'teacher_overall' and cs.context = 'all'
where p.role = 'Teacher'

union all

select
  'current_scores' as table_name,
  cs.id::text as record_id,
  concat(cs.scope, '/', cs.context) as description,
  case 
    when cs.teacher_id is not null and p.user_id is null then '❌ Orphaned teacher_id'
    when cs.branch_id is not null and b.id is null then '❌ Orphaned branch_id'
    else '✅ OK'
  end as status
from public.current_scores cs
left join public.profiles p on p.user_id = cs.teacher_id
left join public.branch b on b.id = cs.branch_id

union all

select
  'teacher_metrics' as table_name,
  tm.teacher_id::text as record_id,
  coalesce(p.full_name, 'Unknown') as description,
  case 
    when p.user_id is null then '❌ Orphaned teacher_id'
    when tm.branch_id is not null and b.id is null then '❌ Invalid branch_id'
    else '✅ OK'
  end as status
from public.teacher_metrics tm
left join public.profiles p on p.user_id = tm.teacher_id
left join public.branch b on b.id = tm.branch_id;

-- Комментарии для документации
comment on view api_v1.vw_leaderboard_teacher_overall_all is 
'ИСПРАВЛЕННЫЙ Teacher Leaderboard: источник истины - profiles, показывает ВСЕХ учителей с их рейтингами. Устраняет дублирование записей.';

comment on view api_v1.vw_leaderboard_branch_overall_all is 
'ИСПРАВЛЕННЫЙ Branch Leaderboard: источник истины - branch, показывает все филиалы с рейтингами и призами для топ-5.';

comment on view api_v1.vw_data_integrity_check is 
'Вспомогательная VIEW для проверки целостности данных между таблицами. Показывает orphaned записи и проблемы связей.';

-- Проверяем, что VIEW работают корректно
select 'Teacher View Test' as test, count(*) as records_count 
from api_v1.vw_leaderboard_teacher_overall_all;

select 'Branch View Test' as test, count(*) as records_count 
from api_v1.vw_leaderboard_branch_overall_all;

select 'Integrity Check' as test, status, count(*) as count
from api_v1.vw_data_integrity_check 
group by status
order by status;
