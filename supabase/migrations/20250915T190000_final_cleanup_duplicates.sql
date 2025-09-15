-- ========================================================================
-- ФИНАЛЬНАЯ ОЧИСТКА ДУБЛЕЙ В current_scores
-- ========================================================================
-- Дата: 2025-09-15 19:00
-- Цель: Окончательно удалить все дубли из current_scores
-- Причина: После исправления функции старые дубли все еще остались
-- ========================================================================

SELECT 'АНАЛИЗ ДУБЛЕЙ ПЕРЕД ОЧИСТКОЙ' as title;

-- Показываем дубли преподавателей
SELECT 
  teacher_id, 
  COUNT(*) as duplicate_count,
  ARRAY_AGG(updated_at ORDER BY updated_at DESC) as all_dates
FROM public.current_scores 
WHERE scope = 'teacher_overall' AND context = 'all'
GROUP BY teacher_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- РЕШЕНИЕ: Удаляем ВСЕ старые записи teacher_overall и пересоздаем
DELETE FROM public.current_scores 
WHERE scope = 'teacher_overall' AND context = 'all';

-- Заново создаем записи teacher_overall с правильной логикой
INSERT INTO public.current_scores (
  scope, context, teacher_id, branch_id, score, rank, updated_at
)
SELECT 
  'teacher_overall' as scope,
  'all' as context,
  teacher_id,
  NULL as branch_id,  -- Правильно: НЕТ branch_id для teacher_overall
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
) teacher_scores;

-- Проверяем результат
SELECT 'РЕЗУЛЬТАТ ОЧИСТКИ' as title;

SELECT 
  teacher_id, 
  COUNT(*) as count_after_cleanup
FROM public.current_scores 
WHERE scope = 'teacher_overall' AND context = 'all'
GROUP BY teacher_id 
HAVING COUNT(*) > 1;

-- Показываем топ-3 преподавателей
SELECT 'ТОППРЕПОДАВАТЕЛЕЙ ПОСЛЕ ОЧИСТКИ' as title;

SELECT 
  p.full_name as name,
  cs.score,
  cs.rank,
  cs.updated_at
FROM public.current_scores cs
INNER JOIN public.profiles p ON p.user_id = cs.teacher_id
WHERE cs.scope = 'teacher_overall' AND cs.context = 'all'
ORDER BY cs.rank
LIMIT 3;

SELECT 'ДУБЛИ УСТРАНЕНЫ!' as final_message;
