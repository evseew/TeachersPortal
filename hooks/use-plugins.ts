"use client"

import { useMemo } from 'react'
import { type PluginConfig } from '@/plugins/core/plugin-types'
import { 
  getPluginConfig, 
  getAllPlugins, 
  getEnabledPlugins,
  getPluginsByRoute 
} from '@/plugins/registry'
import { 
  hasPluginAccess, 
  getAccessiblePlugins,
  hasPluginRouteAccess 
} from '@/lib/auth/plugin-permissions'
import { useUserRole } from './use-user-role'

/**
 * Hook для получения списка доступных плагинов
 * 
 * @param userRole - Роль пользователя (опционально, по умолчанию из сессии)
 * @returns Список плагинов, доступных пользователю
 */
export function useAvailablePlugins(userRole?: string) {
  const { userRole: sessionUserRole } = useUserRole()
  const currentUserRole = userRole || sessionUserRole

  const availablePlugins = useMemo(() => {
    if (!currentUserRole) return []
    return getAccessiblePlugins(currentUserRole as any)
  }, [currentUserRole])

  return {
    plugins: availablePlugins,
    count: availablePlugins.length,
    isEmpty: availablePlugins.length === 0
  }
}

/**
 * Hook для получения конфигурации конкретного плагина
 * 
 * @param pluginId - ID плагина
 * @returns Конфигурация плагина и информация о доступе
 */
export function usePluginConfig(pluginId: string) {
  const { userRole } = useUserRole()
  
  const pluginData = useMemo(() => {
    const config = getPluginConfig(pluginId)
    if (!config) {
      return {
        config: null,
        hasAccess: false,
        accessResult: {
          allowed: false,
          reason: `Плагин "${pluginId}" не найден`
        }
      }
    }

    const accessResult = hasPluginAccess(userRole, pluginId)
    
    return {
      config,
      hasAccess: accessResult.allowed,
      accessResult,
      isReadOnly: accessResult.readOnly || false
    }
  }, [pluginId, userRole])

  return pluginData
}

/**
 * Hook для проверки доступа к маршруту плагина
 * 
 * @param path - Путь маршрута
 * @returns Информация о доступе к маршруту
 */
export function usePluginRouteAccess(path: string) {
  const { userRole } = useUserRole()
  
  const routeAccess = useMemo(() => {
    const plugins = getPluginsByRoute(path)
    const accessResult = hasPluginRouteAccess(userRole, path)
    
    return {
      plugins,
      hasAccess: accessResult.allowed,
      accessResult,
      isReadOnly: accessResult.readOnly || false,
      pluginCount: plugins.length
    }
  }, [path, userRole])

  return routeAccess
}

/**
 * Hook для получения плагинов по категориям
 * Группирует плагины по типу функциональности
 * 
 * @returns Плагины, сгруппированные по категориям
 */
export function usePluginsByCategory() {
  const { plugins } = useAvailablePlugins()
  
  const categorizedPlugins = useMemo(() => {
    const categories: Record<string, PluginConfig[]> = {
      rating: [], // Плагины рейтингов
      sync: [],   // Плагины синхронизации
      system: [], // Системные плагины
      other: []   // Прочие плагины
    }

    plugins.forEach(plugin => {
      if (plugin.id.includes('rating')) {
        categories.rating.push(plugin)
      } else if (plugin.settings?.syncEnabled || plugin.id.includes('sync')) {
        categories.sync.push(plugin)
      } else if (plugin.id.includes('system') || plugin.id.includes('admin')) {
        categories.system.push(plugin)
      } else {
        categories.other.push(plugin)
      }
    })

    return categories
  }, [plugins])

  return categorizedPlugins
}

/**
 * Hook для получения статистики плагинов
 * 
 * @returns Статистика по плагинам системы
 */
export function usePluginStats() {
  const { userRole } = useUserRole()
  
  const stats = useMemo(() => {
    const allPlugins = getAllPlugins()
    const enabledPlugins = getEnabledPlugins()
    const accessiblePlugins = userRole ? getAccessiblePlugins(userRole as any) : []
    
    return {
      total: allPlugins.length,
      enabled: enabledPlugins.length,
      disabled: allPlugins.length - enabledPlugins.length,
      accessible: accessiblePlugins.length,
      restricted: enabledPlugins.length - accessiblePlugins.length
    }
  }, [userRole])

  return stats
}

/**
 * Hook для работы с настройками плагинов
 * 
 * @param pluginId - ID плагина
 * @returns Настройки плагина и методы для работы с ними
 */
export function usePluginSettings(pluginId: string) {
  const { config, hasAccess } = usePluginConfig(pluginId)
  
  const settings = useMemo(() => {
    if (!config || !hasAccess) {
      return {
        settings: {},
        hasSettings: false,
        getSetting: () => undefined,
        hasSetting: () => false
      }
    }

    const pluginSettings = config.settings || {}
    
    return {
      settings: pluginSettings,
      hasSettings: Object.keys(pluginSettings).length > 0,
      getSetting: (key: string, defaultValue?: any) => {
        return pluginSettings[key] ?? defaultValue
      },
      hasSetting: (key: string) => {
        return key in pluginSettings
      }
    }
  }, [config, hasAccess])

  return settings
}

/**
 * Hook для проверки зависимостей плагинов
 * 
 * @param pluginId - ID плагина
 * @returns Информация о зависимостях плагина
 */
export function usePluginDependencies(pluginId: string) {
  const { config } = usePluginConfig(pluginId)
  const { userRole } = useUserRole()
  
  const dependencies = useMemo(() => {
    if (!config?.dependencies) {
      return {
        dependencies: [],
        satisfied: true,
        missing: [],
        hasDependencies: false
      }
    }

    const missing: string[] = []
    const satisfied = config.dependencies.every(depId => {
      const depConfig = getPluginConfig(depId)
      if (!depConfig) {
        missing.push(depId)
        return false
      }
      
      if (!depConfig.enabled) {
        missing.push(depId)
        return false
      }
      
      const access = hasPluginAccess(userRole, depId)
      if (!access.allowed) {
        missing.push(depId)
        return false
      }
      
      return true
    })

    return {
      dependencies: config.dependencies,
      satisfied,
      missing,
      hasDependencies: config.dependencies.length > 0
    }
  }, [config, userRole])

  return dependencies
}
