-- Добавляем поля KPI в teacher leaderboard view для плагина September Rating
-- Это нужно для группировки преподавателей по количеству студентов
-- Создаётся: 2025-09-22

-- Сначала удаляем существующий view
DROP VIEW IF EXISTS api_v1.vw_leaderboard_teacher_overall_all;

-- Создаём новый view с дополнительными полями KPI
CREATE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
SELECT
  p.user_id as teacher_id,
  COALESCE(p.full_name, p.email) as name,
  p.category,
  p.branch_id,
  b.name as branch_name,
  tm.return_pct,
  tm.trial_pct,
  -- Добавляем поля KPI для плагина September Rating
  tm.last_year_base,
  tm.last_year_returned,
  tm.trial_total,
  tm.trial_converted,
  COALESCE(cs.score, 0) as score,
  COALESCE(cs.rank, 999) as rank,  -- Учителя без рейтинга идут в конец
  COALESCE(cs.updated_at, p.created_at) as updated_at,
  -- Дельты считаем только если есть и текущий рейтинг, и предыдущий снимок
  CASE 
    WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (s.rank - cs.rank)  -- Положительная дельта = улучшение
    ELSE NULL
  END as delta_rank,
  CASE 
    WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)  -- Положительная дельта = рост баллов
    ELSE NULL
  END as delta_score,
  NULL::text as prize  -- Призы для учителей пока не используются
FROM public.profiles p
LEFT JOIN public.branch b ON b.id = p.branch_id
LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
  AND cs.scope = 'teacher_overall' 
  AND cs.context = 'all'
LEFT JOIN LATERAL (
  -- Получаем последний снимок для этого учителя
  SELECT s2.rank, s2.score
  FROM public.snapshots s2
  WHERE s2.scope = 'teacher_overall' AND s2.context = 'all' AND s2.teacher_id = p.user_id
  ORDER BY s2.created_at DESC
  LIMIT 1
) s ON true
WHERE p.role = 'Teacher'  -- Показываем только преподавателей
ORDER BY 
  CASE WHEN cs.rank IS NULL THEN 1 ELSE 0 END,  -- Сначала с рейтингом
  COALESCE(cs.rank, 999) ASC;                   -- Потом по рангу

COMMENT ON VIEW api_v1.vw_leaderboard_teacher_overall_all IS 'Отображает ВСЕХ преподавателей из profiles с их рейтингами и KPI полями для плагина September Rating';
