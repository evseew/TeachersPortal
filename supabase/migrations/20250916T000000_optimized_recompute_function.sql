-- ========================================================================
-- ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ ПЕРЕСЧЕТА РЕЙТИНГОВ
-- ========================================================================
-- Дата: 2025-09-16 00:00
-- Цель: Создать интеллектуальную функцию пересчета с поддержкой скоупов
-- Преимущества: Условный пересчет, статистика изменений, защита от частых вызовов
-- ========================================================================

-- Создаем оптимизированную версию функции пересчета
CREATE OR REPLACE FUNCTION public.recompute_current_scores_v2(
  p_scope text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_changes int := 0;
  v_branch_changes int := 0;
  v_teacher_snapshots int := 0;
  v_branch_snapshots int := 0;
  v_start_time timestamp := now();
  v_result jsonb;
  v_last_update timestamp;
BEGIN
  -- Проверяем нужен ли пересчет (если не force)
  IF NOT p_force THEN
    -- Проверяем были ли изменения в teacher_metrics за последние 5 минут
    SELECT MAX(updated_at) INTO v_last_update
    FROM public.teacher_metrics 
    WHERE updated_at > now() - interval '5 minutes';
    
    IF v_last_update IS NULL THEN
      RETURN jsonb_build_object(
        'skipped', true, 
        'reason', 'no_changes_in_last_5_minutes',
        'last_update', NULL,
        'timestamp', now()
      );
    END IF;
  END IF;

  -- Пересчитываем teacher_overall если нужно
  IF p_scope IS NULL OR p_scope = 'teacher_overall' THEN
    -- Подсчитываем сколько записей будет изменено
    WITH new_teacher_scores AS (
      SELECT 
        tm.teacher_id,
        NULL::uuid as branch_id, -- Исправлено: teacher_overall не должен иметь branch_id
        coalesce(tm.score, 0) as score,
        dense_rank() over (order by coalesce(tm.score, 0) desc) as rank
      FROM public.teacher_metrics tm
      INNER JOIN public.profiles p ON p.user_id = tm.teacher_id
      WHERE p.role = 'Teacher'
    ),
    differences AS (
      SELECT nts.*
      FROM new_teacher_scores nts
      LEFT JOIN public.current_scores cs ON cs.teacher_id = nts.teacher_id 
        AND cs.scope = 'teacher_overall' 
        AND cs.context = 'all'
      WHERE cs.teacher_id IS NULL 
         OR cs.score IS DISTINCT FROM nts.score 
         OR cs.rank IS DISTINCT FROM nts.rank
    )
    SELECT COUNT(*) INTO v_teacher_changes FROM differences;

    -- Выполняем upsert только если есть изменения
    IF v_teacher_changes > 0 THEN
      WITH new_teacher_scores AS (
        SELECT 
          tm.teacher_id,
          NULL::uuid as branch_id,
          coalesce(tm.score, 0) as score,
          dense_rank() over (order by coalesce(tm.score, 0) desc) as rank
        FROM public.teacher_metrics tm
        INNER JOIN public.profiles p ON p.user_id = tm.teacher_id
        WHERE p.role = 'Teacher'
      )
      INSERT INTO public.current_scores (scope, context, teacher_id, branch_id, score, rank)
      SELECT 'teacher_overall', 'all', teacher_id, branch_id, score, rank
      FROM new_teacher_scores
      ON CONFLICT (scope, context, teacher_id, branch_id) DO UPDATE
        SET score = excluded.score,
            rank = excluded.rank,
            updated_at = now()
      WHERE (current_scores.score IS DISTINCT FROM excluded.score)
         OR (current_scores.rank IS DISTINCT FROM excluded.rank);

      -- Создаем snapshots для изменившихся teacher записей
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (teacher_id) teacher_id, score, rank
        FROM public.snapshots
        WHERE scope = 'teacher_overall' AND context = 'all'
        ORDER BY teacher_id, created_at DESC
      ),
      changed_teachers AS (
        SELECT cs.teacher_id, cs.branch_id, cs.score, cs.rank
        FROM public.current_scores cs
        LEFT JOIN latest_snapshots ls ON ls.teacher_id = cs.teacher_id
        WHERE cs.scope = 'teacher_overall' AND cs.context = 'all'
          AND ((ls.score IS DISTINCT FROM cs.score) OR (ls.rank IS DISTINCT FROM cs.rank))
      )
      INSERT INTO public.snapshots(scope, context, teacher_id, branch_id, score, rank)
      SELECT 'teacher_overall', 'all', teacher_id, branch_id, score, rank
      FROM changed_teachers;

      GET DIAGNOSTICS v_teacher_snapshots = ROW_COUNT;
    END IF;
  END IF;

  -- Пересчитываем branch_overall если нужно
  IF p_scope IS NULL OR p_scope = 'branch_overall' THEN
    -- Подсчитываем сколько филиалов будет изменено
    WITH new_branch_scores AS (
      SELECT 
        a.branch_id,
        case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end as score,
        dense_rank() over (
          order by (case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end) desc
        ) as rank
      FROM (
        SELECT 
          tm.branch_id,
          sum((coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))::numeric) as weight_sum,
          sum(coalesce(tm.score,0) * (coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))) as weighted_score_sum
        FROM public.teacher_metrics tm
        WHERE tm.branch_id IS NOT NULL
        GROUP BY tm.branch_id
      ) a
    ),
    differences AS (
      SELECT nbs.*
      FROM new_branch_scores nbs
      LEFT JOIN public.current_scores cs ON cs.branch_id = nbs.branch_id 
        AND cs.scope = 'branch_overall' 
        AND cs.context = 'all'
      WHERE cs.branch_id IS NULL 
         OR cs.score IS DISTINCT FROM nbs.score 
         OR cs.rank IS DISTINCT FROM nbs.rank
    )
    SELECT COUNT(*) INTO v_branch_changes FROM differences;

    -- Выполняем upsert только если есть изменения
    IF v_branch_changes > 0 THEN
      WITH new_branch_scores AS (
        SELECT 
          a.branch_id,
          case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end as score,
          dense_rank() over (
            order by (case when a.weight_sum > 0 then round(a.weighted_score_sum / a.weight_sum, 2) else 0 end) desc
          ) as rank
        FROM (
          SELECT 
            tm.branch_id,
            sum((coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))::numeric) as weight_sum,
            sum(coalesce(tm.score,0) * (coalesce(tm.last_year_base,0) + coalesce(tm.trial_total,0))) as weighted_score_sum
          FROM public.teacher_metrics tm
          WHERE tm.branch_id IS NOT NULL
          GROUP BY tm.branch_id
        ) a
      )
      INSERT INTO public.current_scores (scope, context, teacher_id, branch_id, score, rank)
      SELECT 'branch_overall', 'all', NULL, branch_id, score, rank
      FROM new_branch_scores
      ON CONFLICT (scope, context, teacher_id, branch_id) DO UPDATE
        SET score = excluded.score,
            rank = excluded.rank,
            updated_at = now()
      WHERE (current_scores.score IS DISTINCT FROM excluded.score)
         OR (current_scores.rank IS DISTINCT FROM excluded.rank);

      -- Создаем snapshots для изменившихся branch записей
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (branch_id) branch_id, score, rank
        FROM public.snapshots
        WHERE scope = 'branch_overall' AND context = 'all'
        ORDER BY branch_id, created_at DESC
      ),
      changed_branches AS (
        SELECT cs.branch_id, cs.score, cs.rank
        FROM public.current_scores cs
        LEFT JOIN latest_snapshots ls ON ls.branch_id = cs.branch_id
        WHERE cs.scope = 'branch_overall' AND cs.context = 'all'
          AND ((ls.score IS DISTINCT FROM cs.score) OR (ls.rank IS DISTINCT FROM cs.rank))
      )
      INSERT INTO public.snapshots(scope, context, teacher_id, branch_id, score, rank)
      SELECT 'branch_overall', 'all', NULL, branch_id, score, rank
      FROM changed_branches;

      GET DIAGNOSTICS v_branch_snapshots = ROW_COUNT;
    END IF;
  END IF;

  -- Формируем результат
  v_result := jsonb_build_object(
    'executed', true,
    'scope', coalesce(p_scope, 'all'),
    'forced', p_force,
    'teacher_changes', v_teacher_changes,
    'branch_changes', v_branch_changes,
    'teacher_snapshots', v_teacher_snapshots,
    'branch_snapshots', v_branch_snapshots,
    'duration_ms', extract(epoch from (now() - v_start_time)) * 1000,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.recompute_current_scores_v2(text, boolean) IS 
'Оптимизированная функция пересчета рейтингов с поддержкой скоупов и условного выполнения';

-- Создаем индекс для оптимизации проверки изменений
CREATE INDEX IF NOT EXISTS idx_teacher_metrics_updated_at 
ON public.teacher_metrics(updated_at DESC);

-- Создаем функцию для получения статистики пересчетов
CREATE OR REPLACE FUNCTION public.get_recompute_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  WITH stats AS (
    SELECT 
      COUNT(*) as total_teachers,
      COUNT(*) FILTER (WHERE score > 0) as active_teachers,
      ROUND(AVG(score), 2) as avg_score,
      MAX(score) as max_score,
      MAX(updated_at) as last_teacher_update
    FROM public.teacher_metrics tm
    INNER JOIN public.profiles p ON p.user_id = tm.teacher_id
    WHERE p.role = 'Teacher'
  ),
  branch_stats AS (
    SELECT 
      COUNT(DISTINCT branch_id) as total_branches,
      COUNT(*) FILTER (WHERE score > 0) as active_branches,
      ROUND(AVG(score), 2) as avg_branch_score,
      MAX(score) as max_branch_score
    FROM public.current_scores
    WHERE scope = 'branch_overall' AND context = 'all'
  ),
  snapshot_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE scope = 'teacher_overall') as teacher_snapshots,
      COUNT(*) FILTER (WHERE scope = 'branch_overall') as branch_snapshots,
      MAX(created_at) as last_snapshot
    FROM public.snapshots
    WHERE created_at > now() - interval '24 hours'
  )
  SELECT jsonb_build_object(
    'teachers', jsonb_build_object(
      'total', s.total_teachers,
      'active', s.active_teachers,
      'avg_score', s.avg_score,
      'max_score', s.max_score,
      'last_update', s.last_teacher_update
    ),
    'branches', jsonb_build_object(
      'total', bs.total_branches,
      'active', bs.active_branches,
      'avg_score', bs.avg_branch_score,
      'max_score', bs.max_branch_score
    ),
    'snapshots_24h', jsonb_build_object(
      'teacher_snapshots', ss.teacher_snapshots,
      'branch_snapshots', ss.branch_snapshots,
      'last_snapshot', ss.last_snapshot
    ),
    'generated_at', now()
  ) INTO v_stats
  FROM stats s, branch_stats bs, snapshot_stats ss;

  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.get_recompute_stats() IS 
'Возвращает статистику системы рейтингов для мониторинга';
