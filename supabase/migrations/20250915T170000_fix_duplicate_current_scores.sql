-- ========================================================================
-- ИСПРАВЛЕНИЕ ДУБЛИРОВАННЫХ ЗАПИСЕЙ В current_scores
-- ========================================================================
-- Дата: 2025-09-15 17:00
-- Цель: Устранить дублирование записей преподавателей в leaderboard
-- Причина: В current_scores есть дубли с одинаковыми teacher_id но разными updated_at
-- ========================================================================

-- ДИАГНОСТИКА: Найдем дублированные записи
SELECT 'АНАЛИЗ ДУБЛЕЙ В current_scores' as title;

SELECT 
  scope, context, teacher_id, branch_id, count(*) as duplicate_count,
  array_agg(updated_at ORDER BY updated_at DESC) as all_dates
FROM public.current_scores 
WHERE scope = 'teacher_overall' AND context = 'all'
GROUP BY scope, context, teacher_id, branch_id 
HAVING count(*) > 1
ORDER BY duplicate_count DESC;

-- РЕШЕНИЕ: Удаляем старые дубликаты, оставляем самые свежие
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY scope, context, teacher_id, branch_id 
      ORDER BY updated_at DESC
    ) as rn
  FROM public.current_scores 
  WHERE scope = 'teacher_overall' AND context = 'all'
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.current_scores 
WHERE id IN (SELECT id FROM to_delete);

-- АНАЛОГИЧНО ДЛЯ ФИЛИАЛОВ: Найдем дублированные записи филиалов
SELECT 'АНАЛИЗ ДУБЛЕЙ ФИЛИАЛОВ В current_scores' as title;

SELECT 
  scope, context, branch_id, count(*) as duplicate_count,
  array_agg(updated_at ORDER BY updated_at DESC) as all_dates
FROM public.current_scores 
WHERE scope = 'branch_overall' AND context = 'all'
GROUP BY scope, context, branch_id 
HAVING count(*) > 1
ORDER BY duplicate_count DESC;

-- РЕШЕНИЕ ДЛЯ ФИЛИАЛОВ: Удаляем старые дубликаты филиалов
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY scope, context, branch_id 
      ORDER BY updated_at DESC
    ) as rn
  FROM public.current_scores 
  WHERE scope = 'branch_overall' AND context = 'all'
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM public.current_scores 
WHERE id IN (SELECT id FROM to_delete);

-- Проверяем результат очистки
SELECT 'РЕЗУЛЬТАТ ОЧИСТКИ ДУБЛЕЙ (ПРЕПОДАВАТЕЛИ)' as title;

SELECT 
  scope, context, teacher_id, branch_id, count(*) as count_after_cleanup
FROM public.current_scores 
WHERE scope = 'teacher_overall' AND context = 'all'
GROUP BY scope, context, teacher_id, branch_id 
HAVING count(*) > 1;

SELECT 'РЕЗУЛЬТАТ ОЧИСТКИ ДУБЛЕЙ (ФИЛИАЛЫ)' as title;

SELECT 
  scope, context, branch_id, count(*) as count_after_cleanup
FROM public.current_scores 
WHERE scope = 'branch_overall' AND context = 'all'
GROUP BY scope, context, branch_id 
HAVING count(*) > 1;

-- СИСТЕМНОЕ РЕШЕНИЕ: Исправляем функцию recompute_current_scores
-- Убираем branch_id из teacher_overall записей (источник дублей)

CREATE OR REPLACE FUNCTION public.recompute_current_scores()
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_teacher_count int := 0;
  v_branch_count int := 0;
  v_result json;
BEGIN
  -- 1. Очищаем orphaned записи
  DELETE FROM public.current_scores 
  WHERE teacher_id IS NOT NULL 
    AND teacher_id NOT IN (SELECT user_id FROM public.profiles);
    
  DELETE FROM public.current_scores 
  WHERE branch_id IS NOT NULL 
    AND branch_id NOT IN (SELECT id FROM public.branch);

  -- 2. ИСПРАВЛЕНО: teacher_overall БЕЗ branch_id (устраняет дубли)
  INSERT INTO public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  SELECT 
    'teacher_overall' as scope,
    'all' as context,
    teacher_id,
    NULL as branch_id,  -- <<<< ИСПРАВЛЕНИЕ: НЕ используем branch_id для teacher_overall
    score,
    DENSE_RANK() OVER (ORDER BY score DESC) as rank,
    now() as updated_at
  FROM (
    SELECT 
      tm.teacher_id,
      COALESCE(tm.score, 0) as score
    FROM public.teacher_metrics tm
    INNER JOIN public.profiles p ON p.user_id = tm.teacher_id
    WHERE p.role = 'Teacher'
  ) teacher_scores
  ON CONFLICT (scope, context, teacher_id, branch_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_teacher_count = ROW_COUNT;

  -- 3. branch_overall остается как есть (с branch_id)
  INSERT INTO public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  SELECT 
    'branch_overall' as scope,
    'all' as context,
    NULL as teacher_id,
    branch_id,
    weighted_score as score,
    DENSE_RANK() OVER (ORDER BY weighted_score DESC) as rank,
    now() as updated_at
  FROM (
    SELECT 
      p.branch_id,  -- <<<< Используем profiles.branch_id как источник истины
      CASE 
        WHEN SUM(COALESCE(tm.last_year_base, 0) + COALESCE(tm.trial_total, 0)) > 0 THEN
          SUM(COALESCE(tm.score, 0) * (COALESCE(tm.last_year_base, 0) + COALESCE(tm.trial_total, 0))) / 
          SUM(COALESCE(tm.last_year_base, 0) + COALESCE(tm.trial_total, 0))
        ELSE 0
      END as weighted_score
    FROM public.teacher_metrics tm
    INNER JOIN public.profiles p ON p.user_id = tm.teacher_id
    INNER JOIN public.branch b ON b.id = p.branch_id  -- <<<< profiles.branch_id!
    WHERE p.role = 'Teacher' AND p.branch_id IS NOT NULL
    GROUP BY p.branch_id
  ) branch_scores
  ON CONFLICT (scope, context, teacher_id, branch_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_branch_count = ROW_COUNT;

  v_result := json_build_object(
    'teachers_updated', v_teacher_count,
    'branches_updated', v_branch_count,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

SELECT 'ФУНКЦИЯ recompute_current_scores ИСПРАВЛЕНА - ДУБЛИ БОЛЬШЕ НЕ СОЗДАЮТСЯ' as final_message;

COMMENT ON FUNCTION public.recompute_current_scores() IS 'Исправленная функция: teacher_overall без branch_id, branch_overall использует profiles.branch_id';
