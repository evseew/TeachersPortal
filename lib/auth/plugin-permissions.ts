import { type UserRole } from "../constants/user-management"
import { 
  type PluginConfig, 
  type PluginAccessContext, 
  type PluginAccessResult,
  type PluginRegistry 
} from "../../plugins/core/plugin-types"
import { getPluginConfig, getPluginsByRoute, getPluginsByApiRoute } from "../../plugins/registry"

/**
 * Проверяет, имеет ли пользователь доступ к плагину
 * 
 * @param userRole - Роль пользователя
 * @param pluginId - ID плагина
 * @param context - Контекст запроса (опционально)
 * @returns Результат проверки доступа
 */
export function hasPluginAccess(
  userRole: UserRole | undefined,
  pluginId: string,
  context?: PluginAccessContext
): PluginAccessResult {
  // Проверяем, что пользователь авторизован
  if (!userRole) {
    return {
      allowed: false,
      reason: "Пользователь не авторизован"
    }
  }

  // Получаем конфигурацию плагина
  const pluginConfig = getPluginConfig(pluginId)
  if (!pluginConfig) {
    return {
      allowed: false,
      reason: `Плагин "${pluginId}" не найден`
    }
  }

  // Проверяем, активен ли плагин
  if (!pluginConfig.enabled) {
    return {
      allowed: false,
      reason: `Плагин "${pluginId}" отключен`
    }
  }

  // Проверяем базовые разрешения плагина
  if (!pluginConfig.permissions.includes(userRole)) {
    return {
      allowed: false,
      reason: `Роль "${userRole}" не имеет доступа к плагину "${pluginId}"`
    }
  }

  // Дополнительные проверки на основе контекста
  if (context) {
    const additionalChecks = performAdditionalAccessChecks(pluginConfig, userRole, context)
    if (!additionalChecks.allowed) {
      return additionalChecks
    }
  }

  // Все проверки пройдены
  return {
    allowed: true,
    readOnly: isReadOnlyAccessForPlugin(pluginConfig, userRole, context)
  }
}

/**
 * Проверяет доступ к маршруту плагина
 * 
 * @param userRole - Роль пользователя  
 * @param path - Путь маршрута
 * @param context - Контекст запроса
 * @returns Результат проверки доступа
 */
export function hasPluginRouteAccess(
  userRole: UserRole | undefined,
  path: string,
  context?: PluginAccessContext
): PluginAccessResult {
  // Находим плагины, которые обслуживают данный маршрут
  const plugins = getPluginsByRoute(path)
  
  if (plugins.length === 0) {
    return {
      allowed: false,
      reason: `Маршрут "${path}" не обслуживается ни одним плагином`
    }
  }

  // Проверяем доступ к каждому найденному плагину
  for (const plugin of plugins) {
    const access = hasPluginAccess(userRole, plugin.id, context)
    if (access.allowed) {
      return access
    }
  }

  return {
    allowed: false,
    reason: `Нет доступа к маршруту "${path}"`
  }
}

/**
 * Проверяет доступ к API маршруту плагина
 * 
 * @param userRole - Роль пользователя
 * @param apiPath - API путь
 * @param method - HTTP метод
 * @param context - Контекст запроса
 * @returns Результат проверки доступа
 */
export function hasPluginApiAccess(
  userRole: UserRole | undefined,
  apiPath: string,
  method?: string,
  context?: PluginAccessContext
): PluginAccessResult {
  // Находим плагины, которые обслуживают данный API маршрут
  const plugins = getPluginsByApiRoute(apiPath)
  
  if (plugins.length === 0) {
    return {
      allowed: false,
      reason: `API маршрут "${apiPath}" не обслуживается ни одним плагином`
    }
  }

  // Создаем контекст с информацией о методе
  const apiContext: PluginAccessContext = {
    ...context,
    path: apiPath,
    method: method || 'GET'
  }

  // Проверяем доступ к каждому найденному плагину
  for (const plugin of plugins) {
    const access = hasPluginAccess(userRole, plugin.id, apiContext)
    if (access.allowed) {
      return access
    }
  }

  return {
    allowed: false,
    reason: `Нет доступа к API маршруту "${apiPath}"`
  }
}

/**
 * Получает список плагинов, доступных пользователю
 * 
 * @param userRole - Роль пользователя
 * @returns Массив конфигураций доступных плагинов
 */
export function getAccessiblePlugins(userRole: UserRole | undefined): PluginConfig[] {
  if (!userRole) return []

  const { pluginRegistry } = require('../../plugins/registry')
  
  return Object.values(pluginRegistry as PluginRegistry)
    .filter((plugin: PluginConfig) => {
      const access = hasPluginAccess(userRole, plugin.id)
      return access.allowed
    })
}

/**
 * Дополнительные проверки доступа на основе контекста
 * Может быть расширена для специфичных проверок плагинов
 */
function performAdditionalAccessChecks(
  pluginConfig: PluginConfig,
  userRole: UserRole,
  context: PluginAccessContext
): PluginAccessResult {
  // Здесь можно добавить специфичные для плагинов проверки
  // Например, проверки на основе филиала пользователя, времени доступа и т.д.
  
  // Пример: плагин September Rating может иметь временные ограничения
  if (pluginConfig.id === 'september-rating') {
    // Дополнительная логика для September Rating
    // В будущем можно добавить проверки периодов активности
  }

  return { allowed: true }
}

/**
 * Определяет, является ли доступ к плагину только для чтения
 */
function isReadOnlyAccessForPlugin(
  pluginConfig: PluginConfig,
  userRole: UserRole,
  context?: PluginAccessContext
): boolean {
  // Базовая логика: Head of Sales имеет read-only доступ к системным плагинам
  if (userRole === 'Head of Sales' && pluginConfig.id.includes('system')) {
    return true
  }

  // Дополнительные проверки можно добавить здесь
  return false
}

/**
 * Интеграция с существующей системой разрешений
 * Расширяет функцию hasAccess для поддержки плагинов
 */
export function hasAccessWithPlugins(
  userRole: UserRole | undefined,
  path: string,
  context?: PluginAccessContext
): boolean {
  // Сначала проверяем стандартные разрешения
  const { hasAccess } = require('./permissions')
  if (hasAccess(userRole, path)) {
    return true
  }

  // Если стандартные разрешения не дают доступ, проверяем плагины
  const pluginAccess = hasPluginRouteAccess(userRole, path, context)
  return pluginAccess.allowed
}
