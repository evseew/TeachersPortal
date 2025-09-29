-- Создание таблицы для логов синхронизации плагина September Rating
-- Миграция: 20250928T120000_create_september_rating_sync_log.sql

-- Создаем таблицу для хранения логов синхронизации
CREATE TABLE IF NOT EXISTS september_rating_sync_log (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT false,
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  initiated_by TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_september_sync_log_started_at ON september_rating_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_september_sync_log_success ON september_rating_sync_log(success);
CREATE INDEX IF NOT EXISTS idx_september_sync_log_created_at ON september_rating_sync_log(created_at DESC);

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_september_sync_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_september_sync_log_updated_at
  BEFORE UPDATE ON september_rating_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION update_september_sync_log_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE september_rating_sync_log IS 'Логи синхронизации плагина September Rating с Pyrus';
COMMENT ON COLUMN september_rating_sync_log.started_at IS 'Время начала синхронизации';
COMMENT ON COLUMN september_rating_sync_log.completed_at IS 'Время завершения синхронизации';
COMMENT ON COLUMN september_rating_sync_log.success IS 'Успешность синхронизации';
COMMENT ON COLUMN september_rating_sync_log.records_processed IS 'Количество обработанных записей';
COMMENT ON COLUMN september_rating_sync_log.records_updated IS 'Количество обновленных записей';
COMMENT ON COLUMN september_rating_sync_log.errors IS 'Массив ошибок в формате JSON';
COMMENT ON COLUMN september_rating_sync_log.warnings IS 'Массив предупреждений в формате JSON';
COMMENT ON COLUMN september_rating_sync_log.initiated_by IS 'Email пользователя, инициировавшего синхронизацию';
COMMENT ON COLUMN september_rating_sync_log.duration_ms IS 'Длительность синхронизации в миллисекундах';

-- Настройка RLS (Row Level Security) - только для администраторов
ALTER TABLE september_rating_sync_log ENABLE ROW LEVEL SECURITY;

-- Политика: только администраторы могут читать логи
CREATE POLICY september_sync_log_read_policy ON september_rating_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'Administrator'
    )
  );

-- Политика: только система может записывать логи
CREATE POLICY september_sync_log_write_policy ON september_rating_sync_log
  FOR INSERT
  WITH CHECK (true); -- Разрешаем INSERT для всех (система будет писать от имени service_role)

-- Создаем функцию для получения последней синхронизации
CREATE OR REPLACE FUNCTION get_september_rating_last_sync()
RETURNS TABLE (
  last_sync_started_at TIMESTAMPTZ,
  last_sync_success BOOLEAN,
  last_sync_duration_ms INTEGER,
  last_sync_records_processed INTEGER,
  last_sync_errors_count INTEGER,
  last_sync_warnings_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.started_at,
    s.success,
    s.duration_ms,
    s.records_processed,
    COALESCE(jsonb_array_length(s.errors), 0)::INTEGER,
    COALESCE(jsonb_array_length(s.warnings), 0)::INTEGER
  FROM september_rating_sync_log s
  WHERE s.completed_at IS NOT NULL
  ORDER BY s.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для получения статистики синхронизаций
CREATE OR REPLACE FUNCTION get_september_rating_sync_stats()
RETURNS TABLE (
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  avg_duration_ms NUMERIC,
  last_24h_syncs INTEGER,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_syncs,
    COUNT(*) FILTER (WHERE success = true)::INTEGER as successful_syncs,
    COUNT(*) FILTER (WHERE success = false)::INTEGER as failed_syncs,
    COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
    COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours')::INTEGER as last_24h_syncs,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0 
    END as success_rate
  FROM september_rating_sync_log
  WHERE completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права на выполнение функций
GRANT EXECUTE ON FUNCTION get_september_rating_last_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION get_september_rating_sync_stats() TO authenticated;
