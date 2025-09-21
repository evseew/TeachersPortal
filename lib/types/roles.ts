/**
 * Типы для системы управления ролями
 */

export interface Role {
  id: string
  name: string
  description: string
  color: string
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface CreateRoleRequest {
  name: string
  description: string
  color?: string
  permissions?: string[]
}

export interface UpdateRoleRequest {
  id: string
  name?: string
  description?: string
  color?: string
  permissions?: string[]
}

export interface RolePermission {
  id: string
  name: string
  description: string
  category: string
}

// Предопределенные разрешения по разделам сайта
export const SYSTEM_PERMISSIONS: RolePermission[] = [
  // Административные разрешения (только для Administrator)
  { id: 'system', name: 'System Management', description: 'Полное управление системой', category: 'Администрирование' },
  { id: 'users', name: 'User Management', description: 'Управление пользователями и их ролями', category: 'Администрирование' },
  { id: 'roles', name: 'Role Management', description: 'Создание и изменение ролей', category: 'Администрирование' },
  
  // Основные разделы сайта
  { id: 'september_rating', name: 'September Rating', description: 'Доступ к разделу рейтинга за сентябрь и всем его подстраницам', category: 'Основные разделы' },
  { id: 'mass_kpi_input', name: 'Mass KPI Input', description: 'Доступ к разделу массового ввода KPI', category: 'Основные разделы' },
  { id: 'newcomers_rating', name: 'Newcomers Rating', description: 'Доступ к разделу рейтинга новичков', category: 'Основные разделы' },
  { id: 'dashboard', name: 'Dashboard', description: 'Доступ к главной панели управления', category: 'Основные разделы' },
  
  // Базовые разрешения
  { id: 'profile', name: 'Profile Access', description: 'Управление собственным профилем', category: 'Базовые' },
  { id: 'settings', name: 'Settings', description: 'Доступ к личным настройкам', category: 'Базовые' },
]

// Группировка разрешений по категориям
export const PERMISSION_CATEGORIES = {
  'Администрирование': SYSTEM_PERMISSIONS.filter(p => p.category === 'Администрирование'),
  'Основные разделы': SYSTEM_PERMISSIONS.filter(p => p.category === 'Основные разделы'),
  'Базовые': SYSTEM_PERMISSIONS.filter(p => p.category === 'Базовые'),
}

// Цвета для новых ролей
export const ROLE_COLORS = [
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-yellow-100 text-yellow-800',
  'bg-lime-100 text-lime-800',
  'bg-cyan-100 text-cyan-800',
] as const
