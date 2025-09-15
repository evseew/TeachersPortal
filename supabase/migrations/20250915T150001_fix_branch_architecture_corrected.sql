-- ========================================================================
-- АРХИТЕКТУРНОЕ ИСПРАВЛЕНИЕ: Единый источник истины для филиалов (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- ========================================================================
-- Дата: 2025-09-15
-- Цель: Устранить дублирование branch_id и обеспечить консистентность
-- Принцип: profiles.branch_id - единственный источник истины
-- Исправление: Корректная замена функции recompute_current_scores
-- ========================================================================

-- БЛОК 1: АНАЛИЗ И ДИАГНОСТИКА
-- ========================================================================

-- Функция для анализа расхождений в данных
CREATE OR REPLACE FUNCTION public.analyze_branch_inconsistencies()
RETURNS TABLE (
  teacher_id uuid,
  teacher_name text,
  profile_branch_id uuid,
  profile_branch_name text,
  metrics_branch_id uuid,
  metrics_branch_name text,
  status text
)
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 
    p.user_id as teacher_id,
    COALESCE(p.full_name, p.email) as teacher_name,
    p.branch_id as profile_branch_id,
    pb.name as profile_branch_name,
    tm.branch_id as metrics_branch_id,
    mb.name as metrics_branch_name,
    CASE 
      WHEN p.branch_id IS NULL AND tm.branch_id IS NULL THEN 'OK: Оба NULL'
      WHEN p.branch_id = tm.branch_id THEN 'OK: Совпадают'
      WHEN p.branch_id IS NOT NULL AND tm.branch_id IS NULL THEN 'SYNC_NEEDED: profiles заполнен, metrics пуст'
      WHEN p.branch_id IS NULL AND tm.branch_id IS NOT NULL THEN 'CONFLICT: profiles пуст, metrics заполнен'
      WHEN p.branch_id != tm.branch_id THEN 'CONFLICT: Разные филиалы'
      ELSE 'UNKNOWN'
    END as status
  FROM public.profiles p
  LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
  LEFT JOIN public.branch pb ON pb.id = p.branch_id
  LEFT JOIN public.branch mb ON mb.id = tm.branch_id
  WHERE p.role = 'Teacher'
  ORDER BY 
    CASE 
      WHEN p.branch_id IS NOT NULL AND tm.branch_id IS NOT NULL AND p.branch_id != tm.branch_id THEN 1
      WHEN p.branch_id IS NULL AND tm.branch_id IS NOT NULL THEN 2
      WHEN p.branch_id IS NOT NULL AND tm.branch_id IS NULL THEN 3
      ELSE 4
    END,
    p.full_name;
$$;

-- Запускаем анализ и выводим результат
SELECT 'АНАЛИЗ РАСХОЖДЕНИЙ В ДАННЫХ О ФИЛИАЛАХ' as title;
SELECT * FROM public.analyze_branch_inconsistencies() WHERE status != 'OK: Совпадают' AND status != 'OK: Оба NULL';

-- БЛОК 2: СИНХРОНИЗАЦИЯ ДАННЫХ
-- ========================================================================

-- Создаем временную таблицу для логирования изменений
CREATE TEMP TABLE sync_log (
  teacher_id uuid,
  teacher_name text,
  action text,
  old_profile_branch text,
  new_profile_branch text,
  old_metrics_branch text,
  new_metrics_branch text,
  reason text
);

-- Обновляем profiles.branch_id из teacher_metrics там, где profiles пуст
WITH to_update AS (
  SELECT 
    p.user_id,
    p.full_name,
    tm.branch_id,
    b.name as branch_name
  FROM public.profiles p
  INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
  INNER JOIN public.branch b ON b.id = tm.branch_id
  WHERE p.role = 'Teacher' 
    AND p.branch_id IS NULL 
    AND tm.branch_id IS NOT NULL
)
UPDATE public.profiles p
SET branch_id = tu.branch_id,
    updated_at = now()
FROM to_update tu
WHERE p.user_id = tu.user_id;

-- Логируем изменения
INSERT INTO sync_log (teacher_id, teacher_name, action, old_profile_branch, new_profile_branch, reason)
SELECT 
  p.user_id,
  COALESCE(p.full_name, p.email),
  'UPDATE_PROFILE_FROM_METRICS',
  'NULL',
  b.name,
  'Скопирован branch_id из teacher_metrics в profiles'
FROM public.profiles p
INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
INNER JOIN public.branch b ON b.id = p.branch_id
WHERE p.updated_at >= now() - interval '1 minute'
  AND tm.branch_id = p.branch_id;

-- Обновляем teacher_metrics.branch_id из profiles (принудительно приводим к единству)
WITH to_sync AS (
  SELECT 
    p.user_id,
    p.full_name,
    p.branch_id as profile_branch_id,
    tm.branch_id as metrics_branch_id
  FROM public.profiles p
  INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
  WHERE p.role = 'Teacher' 
    AND (
      (p.branch_id IS NOT NULL AND tm.branch_id IS NULL) OR
      (p.branch_id IS NOT NULL AND tm.branch_id IS NOT NULL AND p.branch_id != tm.branch_id) OR
      (p.branch_id IS NULL AND tm.branch_id IS NOT NULL)
    )
)
UPDATE public.teacher_metrics tm
SET branch_id = ts.profile_branch_id,
    updated_at = now()
FROM to_sync ts
WHERE tm.teacher_id = ts.user_id;

-- Выводим лог изменений
SELECT 'ЖУРНАЛ СИНХРОНИЗАЦИИ ДАННЫХ' as title;
SELECT * FROM sync_log ORDER BY teacher_name;

-- Повторный анализ после синхронизации
SELECT 'СОСТОЯНИЕ ПОСЛЕ СИНХРОНИЗАЦИИ' as title;
SELECT 
  COUNT(*) as total_teachers,
  COUNT(CASE WHEN status LIKE 'OK%' THEN 1 END) as synchronized,
  COUNT(CASE WHEN status LIKE 'CONFLICT%' THEN 1 END) as conflicts_remaining,
  COUNT(CASE WHEN status LIKE 'SYNC_NEEDED%' THEN 1 END) as sync_needed
FROM public.analyze_branch_inconsistencies();

-- БЛОК 3: ОБНОВЛЕНИЕ ФУНКЦИИ ПЕРЕСЧЕТА РЕЙТИНГОВ
-- ========================================================================

-- ВАЖНО: Удаляем старую функцию перед созданием новой с другим типом возврата
DROP FUNCTION IF EXISTS public.recompute_current_scores();

-- Создаем улучшенную функцию recompute_current_scores с использованием profiles.branch_id
CREATE OR REPLACE FUNCTION public.recompute_current_scores()
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_teacher_count int := 0;
  v_branch_count int := 0;
  v_snapshots_created int := 0;
  v_result json;
BEGIN
  -- 1. Очищаем current_scores от orphaned записей
  DELETE FROM public.current_scores 
  WHERE teacher_id IS NOT NULL 
    AND teacher_id NOT IN (SELECT user_id FROM public.profiles);
    
  DELETE FROM public.current_scores 
  WHERE branch_id IS NOT NULL 
    AND branch_id NOT IN (SELECT id FROM public.branch);

  -- 2. Пересчитываем рейтинги преподавателей
  -- ИСПОЛЬЗУЕТ profiles.branch_id как источник истины
  INSERT INTO public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  SELECT 
    'teacher_overall' as scope,
    'all' as context,
    teacher_id,
    null as branch_id,  -- Для teacher_overall branch_id всегда NULL
    score,
    dense_rank() over (order by score desc) as rank,
    now() as updated_at
  FROM (
    SELECT 
      p.user_id as teacher_id,
      coalesce(tm.score, 0) as score
    FROM public.profiles p
    LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
    WHERE p.role = 'Teacher'
  ) teacher_scores
  ON CONFLICT (scope, context, teacher_id, branch_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_teacher_count = ROW_COUNT;

  -- 3. Пересчитываем рейтинги филиалов
  -- ИСПОЛЬЗУЕТ profiles.branch_id для группировки
  INSERT INTO public.current_scores (
    scope, context, teacher_id, branch_id, score, rank, updated_at
  )
  SELECT 
    'branch_overall' as scope,
    'all' as context,
    null as teacher_id,
    branch_id,
    weighted_score as score,
    dense_rank() over (order by weighted_score desc) as rank,
    now() as updated_at
  FROM (
    SELECT 
      p.branch_id,
      CASE 
        WHEN sum(coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0)) > 0 THEN
          sum(coalesce(tm.score, 0) * (coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0))) / 
          sum(coalesce(tm.last_year_base, 0) + coalesce(tm.trial_total, 0))
        ELSE 0
      END as weighted_score
    FROM public.profiles p
    INNER JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
    INNER JOIN public.branch b ON b.id = p.branch_id  -- JOIN через profiles!
    WHERE p.role = 'Teacher' AND p.branch_id IS NOT NULL
    GROUP BY p.branch_id
  ) branch_scores
  ON CONFLICT (scope, context, teacher_id, branch_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_branch_count = ROW_COUNT;

  -- 4. Создаём снимки для изменившихся записей
  -- Снимки преподавателей
  INSERT INTO public.snapshots (
    scope, context, teacher_id, branch_id, score, rank, created_at
  )
  SELECT 
    cs.scope, cs.context, cs.teacher_id, cs.branch_id, cs.score, cs.rank, now()
  FROM public.current_scores cs
  LEFT JOIN LATERAL (
    SELECT s.score as prev_score, s.rank as prev_rank
    FROM public.snapshots s
    WHERE s.scope = cs.scope AND s.context = cs.context AND s.teacher_id = cs.teacher_id
    ORDER BY s.created_at DESC LIMIT 1
  ) prev ON true
  WHERE cs.scope = 'teacher_overall' AND cs.context = 'all' AND cs.teacher_id IS NOT NULL
    AND (prev.prev_score IS NULL OR prev.prev_rank IS NULL OR 
         abs(cs.score - prev.prev_score) > 0.01 OR cs.rank != prev.prev_rank);

  -- Снимки филиалов
  INSERT INTO public.snapshots (
    scope, context, teacher_id, branch_id, score, rank, created_at
  )
  SELECT 
    cs.scope, cs.context, cs.teacher_id, cs.branch_id, cs.score, cs.rank, now()
  FROM public.current_scores cs
  LEFT JOIN LATERAL (
    SELECT s.score as prev_score, s.rank as prev_rank
    FROM public.snapshots s
    WHERE s.scope = cs.scope AND s.context = cs.context AND s.branch_id = cs.branch_id
    ORDER BY s.created_at DESC LIMIT 1
  ) prev ON true
  WHERE cs.scope = 'branch_overall' AND cs.context = 'all' AND cs.branch_id IS NOT NULL
    AND (prev.prev_score IS NULL OR prev.prev_rank IS NULL OR 
         abs(cs.score - prev.prev_score) > 0.01 OR cs.rank != prev.prev_rank);

  GET DIAGNOSTICS v_snapshots_created = ROW_COUNT;

  -- 5. Возвращаем результат
  v_result := json_build_object(
    'success', true,
    'teacher_scores_updated', v_teacher_count,
    'branch_scores_updated', v_branch_count,
    'snapshots_created', v_snapshots_created,
    'architecture', 'profiles.branch_id source of truth',
    'updated_at', now()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- БЛОК 4: ИСПРАВЛЕНИЕ VIEW
-- ========================================================================

-- Создаем правильный VIEW с использованием profiles.branch_id
CREATE OR REPLACE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
SELECT
  p.user_id as teacher_id,
  COALESCE(p.full_name, p.email) as name,
  p.category,
  p.branch_id,                    -- Используем profiles.branch_id как источник истины
  b.name as branch_name,          -- JOIN через profiles.branch_id
  tm.return_pct,
  tm.trial_pct,
  COALESCE(cs.score, 0) as score,
  COALESCE(cs.rank, 999) as rank,
  COALESCE(cs.updated_at, p.created_at) as updated_at,
  -- Дельты считаем относительно последнего снимка
  CASE 
    WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (s.rank - cs.rank)
    ELSE NULL
  END as delta_rank,
  CASE 
    WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)
    ELSE NULL
  END as delta_score,
  NULL::text as prize
FROM public.profiles p
LEFT JOIN public.branch b ON b.id = p.branch_id         -- JOIN через profiles!
LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
  AND cs.scope = 'teacher_overall' 
  AND cs.context = 'all'
LEFT JOIN LATERAL (
  SELECT s2.rank, s2.score
  FROM public.snapshots s2
  WHERE s2.scope = 'teacher_overall' 
    AND s2.context = 'all' 
    AND s2.teacher_id = p.user_id
  ORDER BY s2.created_at DESC
  LIMIT 1
) s ON true
WHERE p.role = 'Teacher'
ORDER BY 
  CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,
  COALESCE(cs.rank, 999) ASC,
  p.full_name ASC;

-- БЛОК 5: ТЕСТИРОВАНИЕ И ВАЛИДАЦИЯ
-- ========================================================================

-- Пересчитываем рейтинги с новой архитектурой
SELECT 'ПЕРЕСЧЕТ РЕЙТИНГОВ С НОВОЙ АРХИТЕКТУРОЙ' as title;
SELECT public.recompute_current_scores();

-- Проверяем результат для конкретного учителя (Притчина)
SELECT 'ПРОВЕРКА ДАННЫХ ПРИТЧИНОЙ ПОСЛЕ ИСПРАВЛЕНИЯ' as title;
SELECT 
  teacher_id,
  name,
  branch_id,
  branch_name,
  score,
  rank
FROM api_v1.vw_leaderboard_teacher_overall_all 
WHERE name LIKE '%Притчин%';

-- Финальная проверка архитектуры
SELECT 'ФИНАЛЬНАЯ ВАЛИДАЦИЯ АРХИТЕКТУРЫ' as title;
SELECT 
  'profiles.branch_id заполнен' as check_name,
  COUNT(*) as total,
  COUNT(CASE WHEN branch_id IS NOT NULL THEN 1 END) as with_branch,
  ROUND(COUNT(CASE WHEN branch_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as percentage
FROM public.profiles WHERE role = 'Teacher'
UNION ALL
SELECT 
  'VIEW отображает филиалы',
  COUNT(*),
  COUNT(CASE WHEN branch_name IS NOT NULL THEN 1 END),
  ROUND(COUNT(CASE WHEN branch_name IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2)
FROM api_v1.vw_leaderboard_teacher_overall_all;

-- Комментарии к архитектуре
COMMENT ON FUNCTION public.recompute_current_scores() IS 'Архитектурно исправленная функция: использует profiles.branch_id как единственный источник истины';
COMMENT ON VIEW api_v1.vw_leaderboard_teacher_overall_all IS 'Архитектурно исправленный VIEW: JOIN только через profiles.branch_id (источник истины)';

-- Очищаем временные объекты
DROP FUNCTION public.analyze_branch_inconsistencies();

SELECT 'АРХИТЕКТУРНОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО ✅' as status;
SELECT 'profiles.branch_id теперь единственный источник истины для филиалов' as architecture;
