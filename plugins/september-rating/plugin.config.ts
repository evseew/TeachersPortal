import { PluginConfig } from '../core/plugin-types'

/**
 * Конфигурация плагина September Rating
 * 
 * Плагин предоставляет рейтинги и лидерборды за сентябрь 2024 года
 * с автоматической синхронизацией данных из Pyrus
 */
export const config: PluginConfig = {
  id: 'september-rating',
  name: 'September Rating',
  version: '1.0.0',
  description: 'Рейтинги и лидерборды за сентябрь 2024 с автоматической синхронизацией из Pyrus',
  enabled: true,
  permissions: [
    'Administrator', 
    'Senior Teacher', 
    'Teacher', 
    'Salesman', 
    'Head of Sales'
  ],
  routes: [
    '/september-rating',
    '/september-rating/*'
  ],
  apiRoutes: [
    '/api/plugins/september-rating/*'
  ],
  author: 'System Administrator',
  updatedAt: '2025-09-22',
  settings: {
    // Настройки синхронизации
    syncEnabled: true,
    syncInterval: '0 * * * *', // Каждый час
    
    // Формы Pyrus для синхронизации
    pyrusForms: {
      oldies: 2304918,  // Форма "старички"
      trial: 792300     // Форма "trial"
    },
    
    // Группы преподавателей
    teacherGroups: {
      oldies: {
        ranges: ['35+', '16-34', '6-15'],
        field: 'last_year_base'
      },
      trial: {
        ranges: ['16+', '11-15', '5-10'],
        field: 'trial_total'
      }
    }
  },
  dependencies: []
}
