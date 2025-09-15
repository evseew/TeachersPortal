-- ========================================================================
-- КОМПЛЕКСНЫЙ АНАЛИЗ АРХИТЕКТУРЫ СИСТЕМЫ ТАБЛИЦ
-- ========================================================================
-- Дата: 2025-09-15
-- Цель: Выявить все архитектурные проблемы, конфликты и нарушения целостности
-- Результат: Детальный отчет о состоянии системы с рекомендациями
-- ========================================================================

-- ДИАГНОСТИЧЕСКАЯ ФУНКЦИЯ: ПОЛНЫЙ АНАЛИЗ АРХИТЕКТУРЫ
CREATE OR REPLACE FUNCTION public.comprehensive_architecture_analysis()
RETURNS TABLE (
  category text,
  issue_type text,
  severity text,
  description text,
  affected_count bigint,
  recommendation text,
  example_data jsonb
)
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- 1. ПРОБЛЕМЫ ЦЕЛОСТНОСТИ ДАННЫХ
  
  -- Orphaned teacher_id в current_scores
  RETURN QUERY
  SELECT 
    'DATA_INTEGRITY'::text as category,
    'ORPHANED_CURRENT_SCORES_TEACHERS'::text as issue_type,
    'HIGH'::text as severity,
    'В current_scores есть teacher_id, которых нет в profiles'::text as description,
    (SELECT count(*) FROM public.current_scores cs 
     LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
     WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL)::bigint as affected_count,
    'Удалить orphaned записи или восстановить связи'::text as recommendation,
    (SELECT json_agg(json_build_object('teacher_id', cs.teacher_id, 'scope', cs.scope))
     FROM public.current_scores cs 
     LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
     WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL LIMIT 3)::jsonb as example_data;

  -- Orphaned branch_id в current_scores
  RETURN QUERY
  SELECT 
    'DATA_INTEGRITY'::text,
    'ORPHANED_CURRENT_SCORES_BRANCHES'::text,
    'HIGH'::text,
    'В current_scores есть branch_id, которых нет в branch'::text,
    (SELECT count(*) FROM public.current_scores cs 
     LEFT JOIN public.branch b ON b.id = cs.branch_id 
     WHERE cs.branch_id IS NOT NULL AND b.id IS NULL)::bigint,
    'Удалить orphaned записи или создать отсутствующие филиалы'::text,
    (SELECT json_agg(json_build_object('branch_id', cs.branch_id, 'scope', cs.scope))
     FROM public.current_scores cs 
     LEFT JOIN public.branch b ON b.id = cs.branch_id 
     WHERE cs.branch_id IS NOT NULL AND b.id IS NULL LIMIT 3)::jsonb;

  -- Orphaned teacher_id в teacher_metrics
  RETURN QUERY
  SELECT 
    'DATA_INTEGRITY'::text,
    'ORPHANED_TEACHER_METRICS'::text,
    'CRITICAL'::text,
    'В teacher_metrics есть teacher_id, которых нет в profiles'::text,
    (SELECT count(*) FROM public.teacher_metrics tm 
     LEFT JOIN public.profiles p ON p.user_id = tm.teacher_id 
     WHERE p.user_id IS NULL)::bigint,
    'КРИТИЧНО: Удалить orphaned записи, так как это нарушает FK'::text,
    (SELECT json_agg(json_build_object('teacher_id', tm.teacher_id, 'score', tm.score))
     FROM public.teacher_metrics tm 
     LEFT JOIN public.profiles p ON p.user_id = tm.teacher_id 
     WHERE p.user_id IS NULL LIMIT 3)::jsonb;

  -- Orphaned branch_id в teacher_metrics  
  RETURN QUERY
  SELECT 
    'DATA_INTEGRITY'::text,
    'ORPHANED_TEACHER_METRICS_BRANCHES'::text,
    'MEDIUM'::text,
    'В teacher_metrics есть branch_id, которых нет в branch'::text,
    (SELECT count(*) FROM public.teacher_metrics tm 
     LEFT JOIN public.branch b ON b.id = tm.branch_id 
     WHERE tm.branch_id IS NOT NULL AND b.id IS NULL)::bigint,
    'Удалить orphaned записи или создать отсутствующие филиалы'::text,
    (SELECT json_agg(json_build_object('teacher_id', tm.teacher_id, 'branch_id', tm.branch_id))
     FROM public.teacher_metrics tm 
     LEFT JOIN public.branch b ON b.id = tm.branch_id 
     WHERE tm.branch_id IS NOT NULL AND b.id IS NULL LIMIT 3)::jsonb;

  -- Orphaned teacher_id в snapshots
  RETURN QUERY
  SELECT 
    'DATA_INTEGRITY'::text,
    'ORPHANED_SNAPSHOTS_TEACHERS'::text,
    'LOW'::text,
    'В snapshots есть teacher_id, которых нет в profiles'::text,
    (SELECT count(*) FROM public.snapshots s 
     LEFT JOIN public.profiles p ON p.user_id = s.teacher_id 
     WHERE s.teacher_id IS NOT NULL AND p.user_id IS NULL)::bigint,
    'Удалить orphaned snapshots (исторические данные)'::text,
    (SELECT json_agg(json_build_object('teacher_id', s.teacher_id, 'created_at', s.created_at))
     FROM public.snapshots s 
     LEFT JOIN public.profiles p ON p.user_id = s.teacher_id 
     WHERE s.teacher_id IS NOT NULL AND p.user_id IS NULL LIMIT 3)::jsonb;

  -- 2. АРХИТЕКТУРНЫЕ КОНФЛИКТЫ

  -- Дублирование branch_id между profiles и teacher_metrics
  RETURN QUERY
  SELECT 
    'ARCHITECTURE'::text,
    'BRANCH_ID_DUPLICATION'::text,
    'HIGH'::text,
    'branch_id дублируется в profiles и teacher_metrics'::text,
    (SELECT count(*) FROM public.profiles p 
     INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
     WHERE p.role = 'Teacher' AND (
       (p.branch_id IS NOT NULL AND tm.branch_id IS NOT NULL AND p.branch_id != tm.branch_id) OR
       (p.branch_id IS NULL AND tm.branch_id IS NOT NULL) OR
       (p.branch_id IS NOT NULL AND tm.branch_id IS NULL)
     ))::bigint,
    'Использовать только profiles.branch_id как источник истины'::text,
    (SELECT json_agg(json_build_object(
       'teacher_id', p.user_id, 
       'profile_branch', p.branch_id, 
       'metrics_branch', tm.branch_id
     ))
     FROM public.profiles p 
     INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
     WHERE p.role = 'Teacher' AND p.branch_id != tm.branch_id LIMIT 3)::jsonb;

  -- Дубли в current_scores
  RETURN QUERY
  SELECT 
    'ARCHITECTURE'::text,
    'DUPLICATE_CURRENT_SCORES'::text,
    'MEDIUM'::text,
    'Дублированные записи в current_scores'::text,
    (SELECT count(*) FROM (
       SELECT scope, context, teacher_id, branch_id, count(*) as cnt
       FROM public.current_scores 
       GROUP BY scope, context, teacher_id, branch_id 
       HAVING count(*) > 1
     ) dups)::bigint,
    'Удалить дубли, оставить самые свежие записи'::text,
    (SELECT json_agg(json_build_object(
       'scope', scope, 'context', context, 'teacher_id', teacher_id, 'duplicate_count', cnt
     ))
     FROM (
       SELECT scope, context, teacher_id, branch_id, count(*) as cnt
       FROM public.current_scores 
       GROUP BY scope, context, teacher_id, branch_id 
       HAVING count(*) > 1 
       LIMIT 3
     ) dups)::jsonb;

  -- 3. ПРОБЛЕМЫ С ПОЛЬЗОВАТЕЛЯМИ

  -- Преподаватели без филиала
  RETURN QUERY
  SELECT 
    'USERS'::text,
    'TEACHERS_WITHOUT_BRANCH'::text,
    'MEDIUM'::text,
    'Преподаватели без указанного филиала'::text,
    (SELECT count(*) FROM public.profiles 
     WHERE role = 'Teacher' AND branch_id IS NULL)::bigint,
    'Назначить филиалы преподавателям'::text,
    (SELECT json_agg(json_build_object('user_id', user_id, 'name', full_name, 'email', email))
     FROM public.profiles 
     WHERE role = 'Teacher' AND branch_id IS NULL LIMIT 3)::jsonb;

  -- Преподаватели без метрик
  RETURN QUERY
  SELECT 
    'USERS'::text,
    'TEACHERS_WITHOUT_METRICS'::text,
    'LOW'::text,
    'Преподаватели без записей в teacher_metrics'::text,
    (SELECT count(*) FROM public.profiles p 
     LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
     WHERE p.role = 'Teacher' AND tm.teacher_id IS NULL)::bigint,
    'Создать записи в teacher_metrics для всех преподавателей'::text,
    (SELECT json_agg(json_build_object('user_id', p.user_id, 'name', p.full_name))
     FROM public.profiles p 
     LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id 
     WHERE p.role = 'Teacher' AND tm.teacher_id IS NULL LIMIT 3)::jsonb;

  -- Преподаватели без рейтингов
  RETURN QUERY
  SELECT 
    'USERS'::text,
    'TEACHERS_WITHOUT_SCORES'::text,
    'LOW'::text,
    'Преподаватели без записей в current_scores'::text,
    (SELECT count(*) FROM public.profiles p 
     LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id AND cs.scope = 'teacher_overall'
     WHERE p.role = 'Teacher' AND cs.teacher_id IS NULL)::bigint,
    'Пересчитать рейтинги для включения всех преподавателей'::text,
    (SELECT json_agg(json_build_object('user_id', p.user_id, 'name', p.full_name))
     FROM public.profiles p 
     LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id AND cs.scope = 'teacher_overall'
     WHERE p.role = 'Teacher' AND cs.teacher_id IS NULL LIMIT 3)::jsonb;

  -- 4. ПРОБЛЕМЫ С ФИЛИАЛАМИ

  -- Филиалы без преподавателей
  RETURN QUERY
  SELECT 
    'BRANCHES'::text,
    'BRANCHES_WITHOUT_TEACHERS'::text,
    'LOW'::text,
    'Филиалы без назначенных преподавателей'::text,
    (SELECT count(*) FROM public.branch b 
     LEFT JOIN public.profiles p ON p.branch_id = b.id AND p.role = 'Teacher'
     WHERE p.user_id IS NULL)::bigint,
    'Нормально: филиалы могут быть без преподавателей'::text,
    (SELECT json_agg(json_build_object('branch_id', b.id, 'name', b.name))
     FROM public.branch b 
     LEFT JOIN public.profiles p ON p.branch_id = b.id AND p.role = 'Teacher'
     WHERE p.user_id IS NULL LIMIT 3)::jsonb;

  -- Филиалы без рейтингов
  RETURN QUERY
  SELECT 
    'BRANCHES'::text,
    'BRANCHES_WITHOUT_SCORES'::text,
    'LOW'::text,
    'Филиалы без записей в current_scores'::text,
    (SELECT count(*) FROM public.branch b 
     LEFT JOIN public.current_scores cs ON cs.branch_id = b.id AND cs.scope = 'branch_overall'
     WHERE cs.branch_id IS NULL)::bigint,
    'Пересчитать рейтинги для включения всех активных филиалов'::text,
    (SELECT json_agg(json_build_object('branch_id', b.id, 'name', b.name))
     FROM public.branch b 
     LEFT JOIN public.current_scores cs ON cs.branch_id = b.id AND cs.scope = 'branch_overall'
     WHERE cs.branch_id IS NULL LIMIT 3)::jsonb;

  -- 5. ПРОБЛЕМЫ С VIEW И API

  -- Несоответствие в VIEW leaderboard
  RETURN QUERY
  SELECT 
    'API_VIEWS'::text,
    'VIEW_DATA_INCONSISTENCY'::text,
    'HIGH'::text,
    'VIEW показывает NULL филиалы для учителей с заполненным branch_id'::text,
    (SELECT count(*) FROM public.profiles p 
     LEFT JOIN api_v1.vw_leaderboard_teacher_overall_all v ON v.teacher_id = p.user_id
     WHERE p.role = 'Teacher' AND p.branch_id IS NOT NULL AND v.branch_name IS NULL)::bigint,
    'Исправить JOIN в VIEW для корректного отображения филиалов'::text,
    (SELECT json_agg(json_build_object(
       'teacher_id', p.user_id, 'name', p.full_name, 'branch_id', p.branch_id
     ))
     FROM public.profiles p 
     LEFT JOIN api_v1.vw_leaderboard_teacher_overall_all v ON v.teacher_id = p.user_id
     WHERE p.role = 'Teacher' AND p.branch_id IS NOT NULL AND v.branch_name IS NULL LIMIT 3)::jsonb;

  RETURN;
END;
$$;

-- ФУНКЦИЯ СТАТИСТИКИ ПО АРХИТЕКТУРЕ
CREATE OR REPLACE FUNCTION public.get_architecture_summary()
RETURNS TABLE (
  metric_name text,
  value bigint,
  status text,
  details text
)
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 'Всего пользователей'::text, count(*)::bigint, 'INFO'::text, 'Общее количество записей в profiles'::text
  FROM public.profiles
  
  UNION ALL
  
  SELECT 'Преподавателей', count(*)::bigint, 'INFO', 'Пользователи с ролью Teacher'
  FROM public.profiles WHERE role = 'Teacher'
  
  UNION ALL
  
  SELECT 'Филиалов', count(*)::bigint, 'INFO', 'Общее количество филиалов'
  FROM public.branch
  
  UNION ALL
  
  SELECT 'Записей метрик', count(*)::bigint, 'INFO', 'Записи в teacher_metrics'
  FROM public.teacher_metrics
  
  UNION ALL
  
  SELECT 'Текущих рейтингов', count(*)::bigint, 'INFO', 'Записи в current_scores'
  FROM public.current_scores
  
  UNION ALL
  
  SELECT 'Снимков истории', count(*)::bigint, 'INFO', 'Записи в snapshots'
  FROM public.snapshots
  
  UNION ALL
  
  SELECT 'Orphaned teacher_id в current_scores', 
    (SELECT count(*) FROM public.current_scores cs 
     LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
     WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL)::bigint,
    CASE WHEN (SELECT count(*) FROM public.current_scores cs 
               LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
               WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL) > 0 
         THEN 'ERROR' ELSE 'OK' END,
    'Проблемы целостности данных'
  
  UNION ALL
  
  SELECT 'Orphaned branch_id в current_scores',
    (SELECT count(*) FROM public.current_scores cs 
     LEFT JOIN public.branch b ON b.id = cs.branch_id 
     WHERE cs.branch_id IS NOT NULL AND b.id IS NULL)::bigint,
    CASE WHEN (SELECT count(*) FROM public.current_scores cs 
               LEFT JOIN public.branch b ON b.id = cs.branch_id 
               WHERE cs.branch_id IS NOT NULL AND b.id IS NULL) > 0 
         THEN 'ERROR' ELSE 'OK' END,
    'Проблемы целостности данных'
  
  UNION ALL
  
  SELECT 'Дубли в current_scores',
    (SELECT count(*) FROM (
       SELECT scope, context, teacher_id, branch_id, count(*) as cnt
       FROM public.current_scores 
       GROUP BY scope, context, teacher_id, branch_id 
       HAVING count(*) > 1
     ) dups)::bigint,
    CASE WHEN (SELECT count(*) FROM (
                 SELECT scope, context, teacher_id, branch_id, count(*) as cnt
                 FROM public.current_scores 
                 GROUP BY scope, context, teacher_id, branch_id 
                 HAVING count(*) > 1
               ) dups) > 0 
         THEN 'WARNING' ELSE 'OK' END,
    'Дублированные записи'
  
  UNION ALL
  
  SELECT 'Преподаватели без филиала',
    (SELECT count(*) FROM public.profiles WHERE role = 'Teacher' AND branch_id IS NULL)::bigint,
    CASE WHEN (SELECT count(*) FROM public.profiles WHERE role = 'Teacher' AND branch_id IS NULL) > 0 
         THEN 'WARNING' ELSE 'OK' END,
    'Незаполненные данные'
  
  ORDER BY 
    CASE 
      WHEN metric_name LIKE '%Orphaned%' OR metric_name LIKE '%Дубли%' THEN 1 
      WHEN metric_name LIKE '%без%' THEN 2 
      ELSE 3 
    END, metric_name;
$$;

-- ЗАПУСК АНАЛИЗА
SELECT 'КОМПЛЕКСНЫЙ АНАЛИЗ АРХИТЕКТУРЫ СИСТЕМЫ' as title;
SELECT '=================================================' as separator;

-- Краткая сводка
SELECT 'КРАТКАЯ СВОДКА' as section;
SELECT * FROM public.get_architecture_summary() WHERE status IN ('ERROR', 'WARNING');

SELECT '=================================================' as separator;

-- Детальный анализ проблем
SELECT 'ДЕТАЛЬНЫЙ АНАЛИЗ ПРОБЛЕМ' as section;
SELECT * FROM public.comprehensive_architecture_analysis() 
WHERE affected_count > 0 
ORDER BY 
  CASE severity 
    WHEN 'CRITICAL' THEN 1 
    WHEN 'HIGH' THEN 2 
    WHEN 'MEDIUM' THEN 3 
    ELSE 4 
  END, category, issue_type;

SELECT '=================================================' as separator;

-- Полная статистика
SELECT 'ПОЛНАЯ СТАТИСТИКА СИСТЕМЫ' as section;
SELECT * FROM public.get_architecture_summary();

-- Комментарии
COMMENT ON FUNCTION public.comprehensive_architecture_analysis() IS 'Комплексный анализ архитектуры: находит все проблемы целостности, конфликты и архитектурные недостатки';
COMMENT ON FUNCTION public.get_architecture_summary() IS 'Сводная статистика по архитектуре системы с выделением проблемных областей';

SELECT 'АНАЛИЗ ЗАВЕРШЕН. ИЗУЧИТЕ РЕЗУЛЬТАТЫ ВЫШЕ.' as final_message;

