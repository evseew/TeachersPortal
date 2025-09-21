-- Удаление устаревшей таблицы role_permissions
-- Переходим на новую архитектуру с JSONB разрешениями в таблице roles

-- Удаляем триггер
DROP TRIGGER IF EXISTS set_updated_at ON public.role_permissions;

-- Удаляем таблицу (если есть данные, они потеряются, но в коде она не используется)
DROP TABLE IF EXISTS public.role_permissions;

-- Комментарий для истории
COMMENT ON TABLE public.roles IS 'Динамическое управление ролями пользователей. Заменяет устаревшую role_permissions таблицу.';
