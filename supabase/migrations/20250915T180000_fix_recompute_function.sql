-- ========================================================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ recompute_current_scores
-- ========================================================================
-- Дата: 2025-09-15 18:00
-- Цель: Обновить функцию чтобы она не создавала дубли (индексы уже защищают)
-- Изменения: teacher_overall БЕЗ branch_id, branch_overall с profiles.branch_id
-- ========================================================================

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

  -- 2. ИСПРАВЛЕНО: teacher_overall БЕЗ branch_id (работает с уникальными индексами)
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

  -- 3. branch_overall с исправленной логикой (profiles.branch_id как источник истины)
  -- Сначала удаляем существующие записи branch_overall чтобы избежать конфликтов
  DELETE FROM public.current_scores 
  WHERE scope = 'branch_overall' AND context = 'all';
  
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
  ) branch_scores;

  GET DIAGNOSTICS v_branch_count = ROW_COUNT;

  v_result := json_build_object(
    'teachers_updated', v_teacher_count,
    'branches_updated', v_branch_count,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- Проверяем что функция исправлена
SELECT 'ФУНКЦИЯ recompute_current_scores ОБНОВЛЕНА' as status;

-- Пересчитываем с новой логикой
SELECT public.recompute_current_scores() as result;

-- Проверяем что дублей больше нет
SELECT 'ПРОВЕРКА ОТСУТСТВИЯ ДУБЛЕЙ' as title;

SELECT 
  scope, context, teacher_id, branch_id, count(*) as count
FROM public.current_scores 
GROUP BY scope, context, teacher_id, branch_id 
HAVING count(*) > 1;

COMMENT ON FUNCTION public.recompute_current_scores() IS 'Исправленная функция: teacher_overall без branch_id, branch_overall использует profiles.branch_id. Работает с уникальными индексами.';
