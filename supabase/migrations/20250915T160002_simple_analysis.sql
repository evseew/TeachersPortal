-- ========================================================================
-- УПРОЩЕННЫЙ АНАЛИЗ АРХИТЕКТУРЫ СИСТЕМЫ (БЕЗ ПРОБЛЕМ С АЛИАСАМИ)
-- ========================================================================
-- Дата: 2025-09-15
-- Цель: Быстрый анализ архитектурных проблем
-- ========================================================================

-- ПРОСТАЯ ПРОВЕРКА ORPHANED ЗАПИСЕЙ
SELECT 'ПРОВЕРКА ORPHANED ЗАПИСЕЙ' as section;

-- 1. Orphaned teacher_id в current_scores
SELECT 
  'current_scores -> profiles' as table_link,
  count(*) as orphaned_count,
  'HIGH' as severity,
  'Удалить orphaned записи' as recommendation
FROM public.current_scores cs 
LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL;

-- 2. Orphaned branch_id в current_scores
SELECT 
  'current_scores -> branch' as table_link,
  count(*) as orphaned_count,
  'HIGH' as severity,
  'Удалить orphaned записи или создать филиалы' as recommendation
FROM public.current_scores cs 
LEFT JOIN public.branch b ON b.id = cs.branch_id 
WHERE cs.branch_id IS NOT NULL AND b.id IS NULL;

-- 3. Orphaned teacher_id в teacher_metrics
SELECT 
  'teacher_metrics -> profiles' as table_link,
  count(*) as orphaned_count,
  'CRITICAL' as severity,
  'КРИТИЧНО: Удалить - нарушает FK' as recommendation
FROM public.teacher_metrics tm 
LEFT JOIN public.profiles p ON p.user_id = tm.teacher_id 
WHERE p.user_id IS NULL;

-- 4. Orphaned branch_id в teacher_metrics
SELECT 
  'teacher_metrics -> branch' as table_link,
  count(*) as orphaned_count,
  'MEDIUM' as severity,
  'Удалить orphaned записи' as recommendation
FROM public.teacher_metrics tm 
LEFT JOIN public.branch b ON b.id = tm.branch_id 
WHERE tm.branch_id IS NOT NULL AND b.id IS NULL;

-- 5. Orphaned teacher_id в snapshots
SELECT 
  'snapshots -> profiles' as table_link,
  count(*) as orphaned_count,
  'LOW' as severity,
  'Удалить старые snapshots' as recommendation
FROM public.snapshots s 
LEFT JOIN public.profiles p ON p.user_id = s.teacher_id 
WHERE s.teacher_id IS NOT NULL AND p.user_id IS NULL;

SELECT '=================================================' as separator;

-- ПРОВЕРКА ДУБЛИРОВАНИЯ BRANCH_ID
SELECT 'ПРОБЛЕМЫ С BRANCH_ID' as section;

-- Конфликты между profiles.branch_id и teacher_metrics.branch_id
SELECT 
  'branch_id conflicts' as issue_type,
  count(*) as affected_teachers,
  'HIGH' as severity,
  'Синхронизировать через profiles.branch_id' as recommendation
FROM public.profiles p 
INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
WHERE p.role = 'Teacher' 
  AND (
    (p.branch_id IS NOT NULL AND tm.branch_id IS NOT NULL AND p.branch_id != tm.branch_id) OR
    (p.branch_id IS NULL AND tm.branch_id IS NOT NULL) OR
    (p.branch_id IS NOT NULL AND tm.branch_id IS NULL)
  );

-- Примеры конфликтов
SELECT 
  p.user_id,
  COALESCE(p.full_name, p.email) as teacher_name,
  p.branch_id as profile_branch,
  tm.branch_id as metrics_branch,
  'CONFLICT' as status
FROM public.profiles p 
INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
WHERE p.role = 'Teacher' 
  AND p.branch_id IS NOT NULL 
  AND tm.branch_id IS NOT NULL 
  AND p.branch_id != tm.branch_id
LIMIT 5;

SELECT '=================================================' as separator;

-- ПРОВЕРКА ДУБЛЕЙ В CURRENT_SCORES
SELECT 'ДУБЛИ В CURRENT_SCORES' as section;

SELECT 
  scope,
  context,
  teacher_id,
  branch_id,
  count(*) as duplicate_count
FROM public.current_scores 
GROUP BY scope, context, teacher_id, branch_id 
HAVING count(*) > 1
ORDER BY count(*) DESC;

SELECT '=================================================' as separator;

-- ПРОБЛЕМЫ С ПОЛЬЗОВАТЕЛЯМИ
SELECT 'ПРОБЛЕМЫ С ПОЛЬЗОВАТЕЛЯМИ' as section;

-- Преподаватели без филиала
SELECT 
  'teachers_without_branch' as issue_type,
  count(*) as affected_count,
  'MEDIUM' as severity
FROM public.profiles 
WHERE role = 'Teacher' AND branch_id IS NULL;

-- Преподаватели без метрик
SELECT 
  'teachers_without_metrics' as issue_type,
  count(*) as affected_count,
  'LOW' as severity
FROM public.profiles p 
LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
WHERE p.role = 'Teacher' AND tm.teacher_id IS NULL;

-- Преподаватели без рейтингов
SELECT 
  'teachers_without_scores' as issue_type,
  count(*) as affected_count,
  'LOW' as severity
FROM public.profiles p 
LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id AND cs.scope = 'teacher_overall'
WHERE p.role = 'Teacher' AND cs.teacher_id IS NULL;

SELECT '=================================================' as separator;

-- ПРОВЕРКА VIEW
SELECT 'ПРОБЛЕМЫ С VIEW' as section;

-- VIEW показывает NULL филиалы для учителей с заполненным branch_id
SELECT 
  'view_branch_display_issue' as issue_type,
  count(*) as affected_teachers,
  'HIGH' as severity,
  'Исправить JOIN в VIEW' as recommendation
FROM public.profiles p 
LEFT JOIN api_v1.vw_leaderboard_teacher_overall_all v ON v.teacher_id = p.user_id
WHERE p.role = 'Teacher' 
  AND p.branch_id IS NOT NULL 
  AND v.branch_name IS NULL;

-- Примеры учителей с проблемой VIEW
SELECT 
  p.user_id,
  COALESCE(p.full_name, p.email) as teacher_name,
  p.branch_id,
  b.name as should_show_branch,
  v.branch_name as actually_shows
FROM public.profiles p 
LEFT JOIN public.branch b ON b.id = p.branch_id
LEFT JOIN api_v1.vw_leaderboard_teacher_overall_all v ON v.teacher_id = p.user_id
WHERE p.role = 'Teacher' 
  AND p.branch_id IS NOT NULL 
  AND v.branch_name IS NULL
LIMIT 5;

SELECT '=================================================' as separator;

-- ОБЩАЯ СТАТИСТИКА
SELECT 'ОБЩАЯ СТАТИСТИКА СИСТЕМЫ' as section;

SELECT 'Пользователей всего' as metric, count(*) as value FROM public.profiles
UNION ALL
SELECT 'Преподавателей', count(*) FROM public.profiles WHERE role = 'Teacher'
UNION ALL
SELECT 'Филиалов', count(*) FROM public.branch
UNION ALL
SELECT 'Записей метрик', count(*) FROM public.teacher_metrics
UNION ALL
SELECT 'Текущих рейтингов', count(*) FROM public.current_scores
UNION ALL
SELECT 'Снимков истории', count(*) FROM public.snapshots;

SELECT 'АНАЛИЗ ЗАВЕРШЕН ✅' as status;
