-- Очистка orphaned записей и восстановление целостности данных
-- Выполняется: 2025-09-11
-- Применяется ТОЛЬКО после проверки через diagnostic functions

-- ВНИМАНИЕ: Этот скрипт удаляет данные! 
-- Обязательно сделайте backup перед выполнением!

-- 1. Удаляем orphaned записи из current_scores (teacher_id)
delete from public.current_scores 
where teacher_id is not null 
  and teacher_id not in (select user_id from public.profiles);

-- 2. Удаляем orphaned записи из current_scores (branch_id)  
delete from public.current_scores 
where branch_id is not null 
  and branch_id not in (select id from public.branch);

-- 3. Удаляем orphaned записи из teacher_metrics (teacher_id)
delete from public.teacher_metrics 
where teacher_id not in (select user_id from public.profiles);

-- 4. Удаляем orphaned записи из teacher_metrics (branch_id)
delete from public.teacher_metrics 
where branch_id is not null 
  and branch_id not in (select id from public.branch);

-- 5. Удаляем orphaned записи из snapshots (teacher_id)
delete from public.snapshots 
where teacher_id is not null 
  and teacher_id not in (select user_id from public.profiles);

-- 6. Удаляем orphaned записи из snapshots (branch_id)
delete from public.snapshots 
where branch_id is not null 
  and branch_id not in (select id from public.branch);

-- 7. Удаляем дублированные записи в current_scores
-- Оставляем только самую свежую запись для каждой комбинации scope/context/teacher_id/branch_id
delete from public.current_scores 
where id not in (
  select distinct on (scope, context, coalesce(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
    id
  from public.current_scores 
  order by scope, context, coalesce(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), updated_at desc
);

-- 8. Сброс branch_id у profiles, если branch не существует
update public.profiles 
set branch_id = null 
where branch_id is not null 
  and branch_id not in (select id from public.branch);

-- Выводим статистику после очистки
select 
  'После очистки' as status,
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.branch) as branches_count,
  (select count(*) from public.teacher_metrics) as teacher_metrics_count,
  (select count(*) from public.current_scores) as current_scores_count,
  (select count(*) from public.snapshots) as snapshots_count;
