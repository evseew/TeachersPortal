-- Добавление foreign key constraints для предотвращения orphaned записей
-- Применяется ПОСЛЕ очистки данных
-- Создаётся: 2025-09-11

-- ВАЖНО: Этот скрипт применяется только после успешной очистки orphaned записей!

-- 1. FK для profiles.branch_id -> branch.id
alter table public.profiles 
drop constraint if exists fk_profiles_branch_id;

alter table public.profiles 
add constraint fk_profiles_branch_id 
foreign key (branch_id) references public.branch(id) 
on delete set null;

-- 2. FK для teacher_metrics.teacher_id -> profiles.user_id
alter table public.teacher_metrics 
drop constraint if exists fk_teacher_metrics_teacher_id;

alter table public.teacher_metrics 
add constraint fk_teacher_metrics_teacher_id 
foreign key (teacher_id) references public.profiles(user_id) 
on delete cascade;

-- 3. FK для teacher_metrics.branch_id -> branch.id
alter table public.teacher_metrics 
drop constraint if exists fk_teacher_metrics_branch_id;

alter table public.teacher_metrics 
add constraint fk_teacher_metrics_branch_id 
foreign key (branch_id) references public.branch(id) 
on delete set null;

-- 4. FK для current_scores.teacher_id -> profiles.user_id
alter table public.current_scores 
drop constraint if exists fk_current_scores_teacher_id;

alter table public.current_scores 
add constraint fk_current_scores_teacher_id 
foreign key (teacher_id) references public.profiles(user_id) 
on delete cascade;

-- 5. FK для current_scores.branch_id -> branch.id
alter table public.current_scores 
drop constraint if exists fk_current_scores_branch_id;

alter table public.current_scores 
add constraint fk_current_scores_branch_id 
foreign key (branch_id) references public.branch(id) 
on delete cascade;

-- 6. FK для snapshots.teacher_id -> profiles.user_id
alter table public.snapshots 
drop constraint if exists fk_snapshots_teacher_id;

alter table public.snapshots 
add constraint fk_snapshots_teacher_id 
foreign key (teacher_id) references public.profiles(user_id) 
on delete cascade;

-- 7. FK для snapshots.branch_id -> branch.id
alter table public.snapshots 
drop constraint if exists fk_snapshots_branch_id;

alter table public.snapshots 
add constraint fk_snapshots_branch_id 
foreign key (branch_id) references public.branch(id) 
on delete cascade;

-- 8. Добавляем уникальные constraints для предотвращения дублей
-- Уникальность в current_scores по scope/context/teacher_id (когда teacher_id not null)
create unique index if not exists idx_current_scores_teacher_unique 
on public.current_scores (scope, context, teacher_id) 
where teacher_id is not null and branch_id is null;

-- Уникальность в current_scores по scope/context/branch_id (когда branch_id not null)  
create unique index if not exists idx_current_scores_branch_unique 
on public.current_scores (scope, context, branch_id) 
where branch_id is not null and teacher_id is null;

-- 9. Уникальность teacher_id в teacher_metrics (один преподаватель = одна запись метрик)
alter table public.teacher_metrics 
drop constraint if exists uk_teacher_metrics_teacher_id;

alter table public.teacher_metrics 
add constraint uk_teacher_metrics_teacher_id 
unique (teacher_id);

-- 10. Создаём функцию для проверки constraints
create or replace function public.check_foreign_key_constraints()
returns table (
  constraint_name text,
  table_name text,
  status text,
  violations_count bigint
)
language sql
security definer
as $$
  -- Проверяем profiles.branch_id
  select 
    'fk_profiles_branch_id'::text as constraint_name,
    'profiles'::text as table_name,
    case 
      when (select count(*) from public.profiles p 
            left join public.branch b on b.id = p.branch_id 
            where p.branch_id is not null and b.id is null) = 0 
      then '✅ OK'::text 
      else '❌ VIOLATIONS'::text 
    end as status,
    (select count(*) from public.profiles p 
     left join public.branch b on b.id = p.branch_id 
     where p.branch_id is not null and b.id is null)::bigint as violations_count

  union all

  -- Проверяем teacher_metrics.teacher_id
  select 
    'fk_teacher_metrics_teacher_id'::text,
    'teacher_metrics'::text,
    case 
      when (select count(*) from public.teacher_metrics tm 
            left join public.profiles p on p.user_id = tm.teacher_id 
            where p.user_id is null) = 0 
      then '✅ OK'::text 
      else '❌ VIOLATIONS'::text 
    end,
    (select count(*) from public.teacher_metrics tm 
     left join public.profiles p on p.user_id = tm.teacher_id 
     where p.user_id is null)::bigint

  union all

  -- Проверяем current_scores.teacher_id
  select 
    'fk_current_scores_teacher_id'::text,
    'current_scores'::text,
    case 
      when (select count(*) from public.current_scores cs 
            left join public.profiles p on p.user_id = cs.teacher_id 
            where cs.teacher_id is not null and p.user_id is null) = 0 
      then '✅ OK'::text 
      else '❌ VIOLATIONS'::text 
    end,
    (select count(*) from public.current_scores cs 
     left join public.profiles p on p.user_id = cs.teacher_id 
     where cs.teacher_id is not null and p.user_id is null)::bigint;
$$;

-- Выполняем проверку constraints после добавления
select * from public.check_foreign_key_constraints();

comment on function public.check_foreign_key_constraints() is 'Проверяет состояние foreign key constraints и выводит нарушения';

-- Записываем в лог успешное применение constraints
insert into public.migration_log (migration_name, applied_at, status) 
values ('20250911T000002_add_foreign_key_constraints', now(), 'SUCCESS')
on conflict do nothing;
