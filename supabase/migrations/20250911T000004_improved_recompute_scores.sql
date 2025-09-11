-- Улучшенная функция пересчёта рейтингов с proper foreign key support
-- Устраняет orphaned записи и обеспечивает целостность
-- Создаётся: 2025-09-11

-- Пересоздаём функцию recompute_current_scores с улучшенной логикой
create or replace function public.recompute_current_scores()
returns json
language plpgsql
security definer
as $$
declare
  v_teacher_count int := 0;
  v_branch_count int := 0;
  v_snapshots_created int := 0;
  v_result json;
begin
  -- 1. Очищаем current_scores от orphaned записей перед пересчётом
  delete from public.current_scores 
  where teacher_id is not null 
    and teacher_id not in (select user_id from public.profiles);
    
  delete from public.current_scores 
  where branch_id is not null 
    and branch_id not in (select id from public.branch);

  -- 2. Пересчитываем рейтинги преподавателей
  -- UPSERT current_scores для teacher_overall
  insert into public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  select 
    'teacher_overall' as scope,
    'all' as context,
    teacher_id,
    null as branch_id,
    score,
    dense_rank() over (order by score desc) as rank,
    now() as updated_at
  from (
    select 
      tm.teacher_id,
      coalesce(tm.score, 0) as score
    from public.teacher_metrics tm
    inner join public.profiles p on p.user_id = tm.teacher_id  -- Только существующие учителя
    where p.role = 'Teacher'
  ) teacher_scores
  on conflict (scope, context, teacher_id, branch_id) 
  do update set
    score = excluded.score,
    rank = excluded.rank,
    updated_at = excluded.updated_at;

  get diagnostics v_teacher_count = row_count;

  -- 3. Пересчитываем рейтинги филиалов
  -- Взвешенный рейтинг: сумма (score * вес) / сумма весов
  -- Вес = last_year_base + trial_total
  insert into public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  select 
    'branch_overall' as scope,
    'all' as context,
    null as teacher_id,
    branch_id,
    weighted_score as score,
    dense_rank() over (order by weighted_score desc) as rank,
    now() as updated_at
  from (
    select 
      tm.branch_id,
      case 
        when sum(coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0)) > 0 then
          sum(coalesce(tm.score, 0) * (coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0))) / 
          sum(coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0))
        else 0
      end as weighted_score
    from public.teacher_metrics tm
    inner join public.profiles p on p.user_id = tm.teacher_id  -- Только существующие учителя
    inner join public.branch b on b.id = tm.branch_id          -- Только существующие филиалы
    where p.role = 'Teacher' and tm.branch_id is not null
    group by tm.branch_id
  ) branch_scores
  on conflict (scope, context, teacher_id, branch_id) 
  do update set
    score = excluded.score,
    rank = excluded.rank,
    updated_at = excluded.updated_at;

  get diagnostics v_branch_count = row_count;

  -- 4. Создаём снимки для изменившихся записей
  -- Снимки преподавателей
  insert into public.snapshots (
    scope, context, teacher_id, branch_id, score, rank, created_at
  )
  select 
    cs.scope,
    cs.context,
    cs.teacher_id,
    cs.branch_id,
    cs.score,
    cs.rank,
    now() as created_at
  from public.current_scores cs
  left join lateral (
    select s.score as prev_score, s.rank as prev_rank
    from public.snapshots s
    where s.scope = cs.scope 
      and s.context = cs.context 
      and s.teacher_id = cs.teacher_id
    order by s.created_at desc
    limit 1
  ) prev on true
  where cs.scope = 'teacher_overall' 
    and cs.context = 'all'
    and cs.teacher_id is not null
    and (
      prev.prev_score is null 
      or prev.prev_rank is null 
      or abs(cs.score - prev.prev_score) > 0.01 
      or cs.rank != prev.prev_rank
    );

  -- Снимки филиалов
  insert into public.snapshots (
    scope, context, teacher_id, branch_id, score, rank, created_at
  )
  select 
    cs.scope,
    cs.context,
    cs.teacher_id,
    cs.branch_id,
    cs.score,
    cs.rank,
    now() as created_at
  from public.current_scores cs
  left join lateral (
    select s.score as prev_score, s.rank as prev_rank
    from public.snapshots s
    where s.scope = cs.scope 
      and s.context = cs.context 
      and s.branch_id = cs.branch_id
    order by s.created_at desc
    limit 1
  ) prev on true
  where cs.scope = 'branch_overall' 
    and cs.context = 'all'
    and cs.branch_id is not null
    and (
      prev.prev_score is null 
      or prev.prev_rank is null 
      or abs(cs.score - prev.prev_score) > 0.01 
      or cs.rank != prev.prev_rank
    );

  get diagnostics v_snapshots_created = row_count;

  -- 5. Возвращаем результат операции
  v_result := json_build_object(
    'success', true,
    'teacher_scores_updated', v_teacher_count,
    'branch_scores_updated', v_branch_count,
    'snapshots_created', v_snapshots_created,
    'updated_at', now()
  );

  return v_result;

exception when others then
  -- В случае ошибки возвращаем детали
  v_result := json_build_object(
    'success', false,
    'error', sqlerrm,
    'error_detail', sqlstate,
    'updated_at', now()
  );
  
  return v_result;
end;
$$;

-- Функция для полной ресинхронизации (удаляет ВСЕ current_scores и snapshots)
create or replace function public.full_resync_scores()
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
  v_deleted_scores int;
  v_deleted_snapshots int;
begin
  -- Удаляем все current_scores
  delete from public.current_scores;
  get diagnostics v_deleted_scores = row_count;
  
  -- Удаляем все snapshots
  delete from public.snapshots;
  get diagnostics v_deleted_snapshots = row_count;
  
  -- Пересчитываем с нуля
  select public.recompute_current_scores() into v_result;
  
  -- Обновляем результат
  v_result := v_result || json_build_object(
    'full_resync', true,
    'deleted_scores', v_deleted_scores,
    'deleted_snapshots', v_deleted_snapshots
  );
  
  return v_result;
  
exception when others then
  return json_build_object(
    'success', false,
    'error', sqlerrm,
    'operation', 'full_resync'
  );
end;
$$;

-- Функция для проверки состояния рейтингов
create or replace function public.get_scores_summary()
returns table (
  scope text,
  context text,
  total_records bigint,
  with_scores bigint,
  avg_score numeric,
  max_score numeric,
  last_updated timestamptz
)
language sql
security definer
as $$
  select 
    cs.scope,
    cs.context,
    count(*) as total_records,
    count(case when cs.score > 0 then 1 end) as with_scores,
    avg(cs.score) as avg_score,
    max(cs.score) as max_score,
    max(cs.updated_at) as last_updated
  from public.current_scores cs
  group by cs.scope, cs.context
  order by cs.scope, cs.context;
$$;

-- Комментарии
comment on function public.recompute_current_scores() is 'Улучшенная функция пересчёта рейтингов с проверкой целостности данных';
comment on function public.full_resync_scores() is 'Полная ресинхронизация: удаляет все рейтинги и снимки, пересчитывает заново';
comment on function public.get_scores_summary() is 'Возвращает сводку по состоянию рейтингов';

-- Тестируем функции
select 'Scores Summary' as test;
select * from public.get_scores_summary();
