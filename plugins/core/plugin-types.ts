import { type UserRole } from "../../lib/constants/user-management"

/**
 * Конфигурация плагина
 * Описывает базовые настройки, права доступа и маршруты плагина
 */
export interface PluginConfig {
  /** Уникальный идентификатор плагина */
  id: string
  
  /** Отображаемое название плагина */
  name: string
  
  /** Версия плагина в формате semver */
  version: string
  
  /** Описание функциональности плагина */
  description: string
  
  /** Статус активности плагина */
  enabled: boolean
  
  /** Роли пользователей, имеющих доступ к плагину */
  permissions: UserRole[]
  
  /** Маршруты, которые обслуживает плагин */
  routes: string[]
  
  /** API маршруты плагина (опционально) */
  apiRoutes?: string[]
  
  /** Дополнительные настройки плагина */
  settings?: Record<string, any>
  
  /** Зависимости от других плагинов */
  dependencies?: string[]
  
  /** Автор плагина */
  author?: string
  
  /** Дата создания/обновления */
  updatedAt?: string
}

/**
 * Реестр всех зарегистрированных плагинов
 * Ключ - ID плагина, значение - его конфигурация
 */
export interface PluginRegistry {
  [pluginId: string]: PluginConfig
}

/**
 * Контекст плагина для проверки доступа
 * Содержит дополнительную информацию для принятия решений о доступе
 */
export interface PluginAccessContext {
  /** Текущий путь запроса */
  path: string
  
  /** HTTP метод (для API маршрутов) */
  method?: string
  
  /** Дополнительные параметры запроса */
  params?: Record<string, string>
  
  /** Пользовательские данные */
  user?: {
    id: string
    email: string
    role: UserRole
    branchId?: string
  }
}

/**
 * Результат проверки доступа к плагину
 */
export interface PluginAccessResult {
  /** Разрешен ли доступ */
  allowed: boolean
  
  /** Причина отказа в доступе (если allowed = false) */
  reason?: string
  
  /** Является ли доступ только для чтения */
  readOnly?: boolean
  
  /** Дополнительные ограничения */
  restrictions?: string[]
}

/**
 * Интерфейс для плагинов, которые могут выполнять синхронизацию данных
 */
export interface SyncablePlugin {
  /** Запуск синхронизации данных */
  sync(): Promise<SyncResult>
  
  /** Получение статуса последней синхронизации */
  getSyncStatus(): Promise<SyncStatus>
}

/**
 * Результат синхронизации данных
 */
export interface SyncResult {
  /** Успешность операции */
  success: boolean
  
  /** Количество обработанных записей */
  recordsProcessed: number
  
  /** Количество обновленных записей */
  recordsUpdated: number
  
  /** Время начала синхронизации */
  startedAt: Date
  
  /** Время завершения синхронизации */
  completedAt: Date
  
  /** Ошибки, возникшие при синхронизации */
  errors?: string[]
  
  /** Предупреждения */
  warnings?: string[]
}

/**
 * Статус синхронизации
 */
export interface SyncStatus {
  /** Время последней успешной синхронизации */
  lastSuccessfulSync?: Date
  
  /** Время последней попытки синхронизации */
  lastAttempt?: Date
  
  /** Статус последней синхронизации */
  lastResult?: 'success' | 'error' | 'partial'
  
  /** Текущее состояние */
  isRunning: boolean
  
  /** Следующая запланированная синхронизация */
  nextScheduledSync?: Date
}
