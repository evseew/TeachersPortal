-- Добавление роли "Regular User" для пользователей из Pyrus
-- Минимальная миграция для поддержки синхронизации

-- Добавляем новое значение в enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Regular User';

-- Комментарий для документации
COMMENT ON TYPE user_role IS 'Роли пользователей в системе. Regular User - для пользователей из Pyrus, которым администратор еще не назначил роль';
