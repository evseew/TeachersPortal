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

// Предопределенные разрешения
export const SYSTEM_PERMISSIONS: RolePermission[] = [
  { id: 'system', name: 'System Management', description: 'Full system administration', category: 'Administration' },
  { id: 'users', name: 'User Management', description: 'Manage users and their roles', category: 'Administration' },
  { id: 'roles', name: 'Role Management', description: 'Create and modify roles', category: 'Administration' },
  { id: 'kpi', name: 'KPI Input', description: 'Input and modify KPI data', category: 'Teaching' },
  { id: 'rating', name: 'View Ratings', description: 'View leaderboards and ratings', category: 'Teaching' },
  { id: 'system_readonly', name: 'System Read-Only', description: 'View system settings (read-only)', category: 'Administration' },
  { id: 'profile', name: 'Profile Access', description: 'Basic profile management', category: 'Basic' },
]

// Группировка разрешений по категориям
export const PERMISSION_CATEGORIES = {
  'Administration': SYSTEM_PERMISSIONS.filter(p => p.category === 'Administration'),
  'Teaching': SYSTEM_PERMISSIONS.filter(p => p.category === 'Teaching'),
  'Basic': SYSTEM_PERMISSIONS.filter(p => p.category === 'Basic'),
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
