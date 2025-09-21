-- Создание таблицы для управления ролями
-- Позволяет динамически создавать/изменять роли через UI

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
  is_system BOOLEAN NOT NULL DEFAULT false, -- системные роли нельзя удалять
  permissions JSONB DEFAULT '[]'::JSONB, -- массив разрешений
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT roles_name_check CHECK (length(name) >= 2 AND length(name) <= 50),
  CONSTRAINT roles_description_check CHECK (length(description) >= 5 AND length(description) <= 200)
);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at_roles()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_updated_at_roles ON public.roles;
CREATE TRIGGER set_updated_at_roles
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_roles();

-- Заполняем системными ролями
INSERT INTO public.roles (name, description, color, is_system, permissions) VALUES
  ('Administrator', 'Full system access', 'bg-red-100 text-red-800', true, '["system", "users", "roles", "kpi", "rating"]'),
  ('Senior Teacher', 'Manager role with KPI input access', 'bg-blue-100 text-blue-800', true, '["kpi", "rating"]'),
  ('Teacher', 'Basic teaching access with categories', 'bg-green-100 text-green-800', true, '["rating"]'),
  ('Salesman', 'Sales and customer management', 'bg-purple-100 text-purple-800', true, '["rating"]'),
  ('Head of Sales', 'Sales team leadership and analytics', 'bg-orange-100 text-orange-800', true, '["rating", "system_readonly"]'),
  ('Regular User', 'Basic user from Pyrus sync, awaiting role assignment', 'bg-gray-100 text-gray-800', true, '["profile"]')
ON CONFLICT (name) DO NOTHING;

-- RLS политики
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Политика чтения для всех авторизованных
CREATE POLICY "roles_select_policy" ON public.roles
  FOR SELECT USING (true); -- Все могут читать роли

-- Политика записи только для администраторов
CREATE POLICY "roles_modify_policy" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'Administrator'
    )
  );

-- Комментарии
COMMENT ON TABLE public.roles IS 'Динамическое управление ролями пользователей';
COMMENT ON COLUMN public.roles.is_system IS 'Системные роли нельзя удалять, только редактировать описание';
COMMENT ON COLUMN public.roles.permissions IS 'JSON массив разрешений для роли';
