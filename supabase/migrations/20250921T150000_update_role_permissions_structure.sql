-- Обновление структуры разрешений под логику разделов сайта
-- Переход от абстрактных разрешений к конкретным разделам

BEGIN;

-- Обновляем разрешения для существующих системных ролей
-- Administrator - полный доступ ко всем разделам
UPDATE public.roles 
SET permissions = '["system", "users", "roles", "september_rating", "mass_kpi_input", "newcomers_rating", "dashboard", "profile", "settings"]'
WHERE name = 'Administrator';

-- Senior Teacher - доступ к основным разделам кроме системного управления
UPDATE public.roles 
SET permissions = '["september_rating", "mass_kpi_input", "newcomers_rating", "dashboard", "profile", "settings"]'
WHERE name = 'Senior Teacher';

-- Teacher - доступ к просмотру рейтингов и базовым функциям
UPDATE public.roles 
SET permissions = '["september_rating", "newcomers_rating", "dashboard", "profile", "settings"]'
WHERE name = 'Teacher';

-- Salesman - доступ к рейтингам и базовым функциям
UPDATE public.roles 
SET permissions = '["september_rating", "newcomers_rating", "dashboard", "profile", "settings"]'
WHERE name = 'Salesman';

-- Head of Sales - доступ к рейтингам, системе (только чтение) и базовым функциям
UPDATE public.roles 
SET permissions = '["september_rating", "newcomers_rating", "dashboard", "profile", "settings"]'
WHERE name = 'Head of Sales';

-- Regular User - только базовые разрешения
UPDATE public.roles 
SET permissions = '["profile", "settings"]'
WHERE name = 'Regular User';

-- Комментарии для новой структуры
COMMENT ON TABLE public.roles IS 'Управление ролями с разрешениями по разделам сайта. Разрешения теперь соответствуют конкретным разделам: september_rating, mass_kpi_input, newcomers_rating, dashboard, profile, settings, system, users, roles';

COMMIT;
