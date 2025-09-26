import { PluginRegistry } from './core/plugin-types'
import { config as septemberRatingConfig } from './september-rating/plugin.config'

/**
 * Централизованный реестр всех плагинов системы
 * 
 * Здесь регистрируются все доступные плагины.
 * Плагины загружаются статически во время сборки (build-time).
 * 
 * Для добавления нового плагина:
 * 1. Импортируйте конфигурацию плагина
 * 2. Добавьте её в объект pluginRegistry
 * 3. Убедитесь, что ID плагина уникален
 */
export const pluginRegistry: PluginRegistry = {
  // Зарегистрированные плагины
  'september-rating': septemberRatingConfig,
  
  // Будущие плагины:
  // 'newcomers-rating': newcomersRatingConfig,
}

/**
 * Получить конфигурацию плагина по ID
 */
export function getPluginConfig(pluginId: string) {
  return pluginRegistry[pluginId]
}

/**
 * Получить список всех зарегистрированных плагинов
 */
export function getAllPlugins() {
  return Object.values(pluginRegistry)
}

/**
 * Получить список активных плагинов
 */
export function getEnabledPlugins() {
  return Object.values(pluginRegistry).filter(plugin => plugin.enabled)
}

/**
 * Проверить, зарегистрирован ли плагин
 */
export function isPluginRegistered(pluginId: string): boolean {
  return pluginId in pluginRegistry
}

/**
 * Получить плагины по маршруту
 * Возвращает плагины, которые обслуживают указанный маршрут
 */
export function getPluginsByRoute(route: string) {
  return Object.values(pluginRegistry).filter(plugin => {
    return plugin.enabled && plugin.routes.some(pluginRoute => {
      // Поддерживаем wildcard маршруты (например, /september-rating/*)
      if (pluginRoute.endsWith('/*')) {
        const baseRoute = pluginRoute.slice(0, -2)
        return route === baseRoute || route.startsWith(baseRoute + '/')
      }
      return route === pluginRoute
    })
  })
}

/**
 * Получить плагины по API маршруту
 */
export function getPluginsByApiRoute(apiRoute: string) {
  return Object.values(pluginRegistry).filter(plugin => {
    if (!plugin.enabled || !plugin.apiRoutes) return false
    
    return plugin.apiRoutes.some(pluginApiRoute => {
      if (pluginApiRoute.endsWith('/*')) {
        const baseRoute = pluginApiRoute.slice(0, -2)
        return apiRoute === baseRoute || apiRoute.startsWith(baseRoute + '/')
      }
      return apiRoute === pluginApiRoute
    })
  })
}
