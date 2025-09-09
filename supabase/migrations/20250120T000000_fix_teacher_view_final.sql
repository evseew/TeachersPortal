-- Исправляем view для Teacher Leaderboard чтобы показывать ВСЕХ преподавателей
-- Источник истины: profiles, а не current_scores
-- Это устраняет дублирование записей

-- Пересоздаём view для отображения всех преподавателей
CREATE OR REPLACE VIEW api_v1.vw_leaderboard_teacher_overall_all AS
SELECT
  p.user_id as teacher_id,
  COALESCE(p.full_name, p.email) as name,
  p.category,
  b.id as branch_id,
  b.name as branch_name,
  tm.return_pct,
  tm.trial_pct,
  COALESCE(cs.score, 0) as score,
  COALESCE(cs.rank, 999) as rank,  -- Преподаватели без рейтинга идут в конец
  COALESCE(cs.updated_at, now()) as updated_at,
  -- deltas считаем относительно последнего снапшота
  CASE 
    WHEN cs.rank IS NOT NULL AND s.rank IS NOT NULL THEN (cs.rank - s.rank)
    ELSE NULL
  END as delta_rank,
  CASE 
    WHEN cs.score IS NOT NULL AND s.score IS NOT NULL THEN (cs.score - s.score)
    ELSE NULL
  END as delta_score,
  NULL::text as prize
FROM public.profiles p
LEFT JOIN public.teacher_metrics tm ON tm.teacher_id = p.user_id
LEFT JOIN public.branch b ON b.id = tm.branch_id
LEFT JOIN public.current_scores cs ON cs.teacher_id = p.user_id 
  AND cs.scope = 'teacher_overall' 
  AND cs.context = 'all'
LEFT JOIN LATERAL (
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

COMMENT ON VIEW api_v1.vw_leaderboard_teacher_overall_all IS 'Отображает ВСЕХ преподавателей из profiles с их рейтингами (если есть). Исправляет дублирование записей.';
