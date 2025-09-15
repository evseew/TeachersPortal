-- ========================================================================
-- ПОШАГОВЫЙ АНАЛИЗ АРХИТЕКТУРЫ (ПО ЧАСТЯМ)
-- ========================================================================

-- ЧАСТЬ 1: ORPHANED ЗАПИСИ В CURRENT_SCORES
SELECT 
  'ORPHANED в current_scores (teacher_id)' as issue,
  count(*) as count
FROM public.current_scores cs 
LEFT JOIN public.profiles p ON p.user_id = cs.teacher_id 
WHERE cs.teacher_id IS NOT NULL AND p.user_id IS NULL;
