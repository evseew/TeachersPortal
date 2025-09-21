-- Миграция с enum user_role на динамические роли
-- Это позволит создавать любые роли через UI и назначать их пользователям

BEGIN;

-- 1. Добавляем новое поле role_id для связи с таблицей roles
ALTER TABLE public.profiles 
ADD COLUMN role_id UUID REFERENCES public.roles(id);

-- 2. Заполняем role_id на основе текущих enum ролей
UPDATE public.profiles 
SET role_id = (
  SELECT r.id 
  FROM public.roles r 
  WHERE r.name = profiles.role::text
);

-- 3. Для пользователей без найденной роли ставим Regular User
UPDATE public.profiles 
SET role_id = (
  SELECT r.id 
  FROM public.roles r 
  WHERE r.name = 'Regular User'
)
WHERE role_id IS NULL;

-- 4. Делаем role_id обязательным после заполнения
ALTER TABLE public.profiles 
ALTER COLUMN role_id SET NOT NULL;

-- 5. Создаем функцию для получения роли (для обратной совместимости)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT r.name 
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.user_id = $1;
$$;

-- 6. Создаем view для обратной совместимости
CREATE OR REPLACE VIEW public.profiles_with_role AS
SELECT 
  p.user_id,
  p.email,
  r.name as role,
  p.category,
  p.branch_id,
  p.full_name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  p.role_id,
  r.permissions
FROM public.profiles p
JOIN public.roles r ON p.role_id = r.id;

-- 7. Комментарии
COMMENT ON COLUMN public.profiles.role_id IS 'Ссылка на динамическую роль из таблицы roles';
COMMENT ON VIEW public.profiles_with_role IS 'View для обратной совместимости - объединяет profiles с roles';

COMMIT;
