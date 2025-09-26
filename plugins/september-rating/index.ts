/**
 * Плагин September Rating
 * 
 * Экспорты компонентов, страниц и конфигурации плагина
 * для использования в основном приложении
 */

// Конфигурация плагина
export { config } from './plugin.config'

// Основные страницы
export { SeptemberRatingMainPage } from './pages/main-page'
export { TeacherLeaderboardPage } from './pages/teacher-leaderboard-page'
export { BranchLeaderboardPage } from './pages/branch-leaderboard-page'
export { RulesPage } from './pages/rules-page'

// Компоненты
export { TeacherLeaderboard } from './components/teacher-leaderboard'
export { BranchLeaderboard } from './components/branch-leaderboard'
export { RulesDisplay } from './components/rules-display'

// Сервисы
export { SeptemberRatingPyrusAdapter } from './services/pyrus-adapter'

// Правила (для использования в других частях системы)
export { default as selectionRules } from './rules/selection-rules.json'
