-- Диагностические RPC функции для проверки целостности данных
-- Создаётся: 2025-09-11

-- 1. Проверка orphaned teacher_id в current_scores
create or replace function public.check_orphaned_current_scores_teachers()
returns table (
  teacher_id uuid,
  scope text,
  context text,
  score numeric,
  rank integer
)
language sql
security definer
as $$
  select 
    cs.teacher_id,
    cs.scope,
    cs.context,
    cs.score,
    cs.rank
  from public.current_scores cs
  left join public.profiles p on p.user_id = cs.teacher_id
  where cs.teacher_id is not null 
    and p.user_id is null;
$$;

-- 2. Проверка orphaned branch_id в current_scores
create or replace function public.check_orphaned_current_scores_branches()
returns table (
  branch_id uuid,
  scope text,
  context text,
  score numeric,
  rank integer
)
language sql
security definer
as $$
  select 
    cs.branch_id,
    cs.scope,
    cs.context,
    cs.score,
    cs.rank
  from public.current_scores cs
  left join public.branch b on b.id = cs.branch_id
  where cs.branch_id is not null 
    and b.id is null;
$$;

-- 3. Проверка дублей в current_scores
create or replace function public.check_duplicate_current_scores()
returns table (
  scope text,
  context text,
  teacher_id uuid,
  branch_id uuid,
  duplicate_count bigint
)
language sql
security definer
as $$
  select 
    cs.scope,
    cs.context,
    cs.teacher_id,
    cs.branch_id,
    count(*) as duplicate_count
  from public.current_scores cs
  group by cs.scope, cs.context, cs.teacher_id, cs.branch_id
  having count(*) > 1;
$$;

-- 4. Проверка orphaned teacher_id в teacher_metrics
create or replace function public.check_orphaned_teacher_metrics()
returns table (
  teacher_id uuid,
  branch_id uuid,
  last_year_base integer,
  return_pct numeric,
  trial_pct numeric,
  score numeric
)
language sql
security definer
as $$
  select 
    tm.teacher_id,
    tm.branch_id,
    tm.last_year_base,
    tm.return_pct,
    tm.trial_pct,
    tm.score
  from public.teacher_metrics tm
  left join public.profiles p on p.user_id = tm.teacher_id
  where p.user_id is null;
$$;

-- 5. Проверка orphaned branch_id в teacher_metrics
create or replace function public.check_orphaned_teacher_metrics_branches()
returns table (
  teacher_id uuid,
  branch_id uuid,
  last_year_base integer,
  return_pct numeric
)
language sql
security definer
as $$
  select 
    tm.teacher_id,
    tm.branch_id,
    tm.last_year_base,
    tm.return_pct
  from public.teacher_metrics tm
  left join public.branch b on b.id = tm.branch_id
  where tm.branch_id is not null 
    and b.id is null;
$$;

-- 6. Проверка orphaned teacher_id в snapshots
create or replace function public.check_orphaned_snapshots_teachers()
returns table (
  id uuid,
  teacher_id uuid,
  branch_id uuid,
  scope text,
  context text,
  created_at timestamptz
)
language sql
security definer
as $$
  select 
    s.id,
    s.teacher_id,
    s.branch_id,
    s.scope,
    s.context,
    s.created_at
  from public.snapshots s
  left join public.profiles p on p.user_id = s.teacher_id
  where s.teacher_id is not null 
    and p.user_id is null;
$$;

-- 7. Получить общую статистику по таблицам
create or replace function public.get_table_stats()
returns table (
  table_name text,
  total_records bigint,
  teachers_count bigint,
  branches_count bigint,
  orphaned_teachers bigint,
  orphaned_branches bigint
)
language sql
security definer
as $$
  select 
    'profiles'::text as table_name,
    (select count(*) from public.profiles)::bigint as total_records,
    (select count(*) from public.profiles where role = 'Teacher')::bigint as teachers_count,
    0::bigint as branches_count,
    0::bigint as orphaned_teachers,
    0::bigint as orphaned_branches
  
  union all
  
  select 
    'branch'::text,
    (select count(*) from public.branch)::bigint,
    0::bigint,
    (select count(*) from public.branch)::bigint,
    0::bigint,
    0::bigint
    
  union all
  
  select 
    'teacher_metrics'::text,
    (select count(*) from public.teacher_metrics)::bigint,
    0::bigint,
    0::bigint,
    (select count(*) from public.check_orphaned_teacher_metrics())::bigint,
    (select count(*) from public.check_orphaned_teacher_metrics_branches())::bigint
    
  union all
  
  select 
    'current_scores'::text,
    (select count(*) from public.current_scores)::bigint,
    0::bigint,
    0::bigint,
    (select count(*) from public.check_orphaned_current_scores_teachers())::bigint,
    (select count(*) from public.check_orphaned_current_scores_branches())::bigint
    
  union all
  
  select 
    'snapshots'::text,
    (select count(*) from public.snapshots)::bigint,
    0::bigint,
    0::bigint,
    (select count(*) from public.check_orphaned_snapshots_teachers())::bigint,
    0::bigint;
$$;

comment on function public.check_orphaned_current_scores_teachers() is 'Возвращает записи current_scores с teacher_id, которых нет в profiles';
comment on function public.check_orphaned_current_scores_branches() is 'Возвращает записи current_scores с branch_id, которых нет в branch';
comment on function public.check_duplicate_current_scores() is 'Возвращает дублированные записи в current_scores';
comment on function public.check_orphaned_teacher_metrics() is 'Возвращает записи teacher_metrics с teacher_id, которых нет в profiles';
comment on function public.check_orphaned_teacher_metrics_branches() is 'Возвращает записи teacher_metrics с branch_id, которых нет в branch';
comment on function public.check_orphaned_snapshots_teachers() is 'Возвращает записи snapshots с teacher_id, которых нет в profiles';
comment on function public.get_table_stats() is 'Возвращает общую статистику по таблицам и orphaned записям';
