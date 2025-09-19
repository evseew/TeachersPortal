import { type UserRole } from "@/lib/constants/user-management"

// Правила доступа согласно PRD
// Базовая карта: покрывает основные разделы. Дочерние пути наследуют права родителя.
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // September Rating - доступ всем кроме Regular User
  "/september-rating": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"],
  "/dashboard": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"],
  
  // Mass KPI Input - только Administrator и Senior Teacher
  "/mass-kpi-input": ["Administrator", "Senior Teacher"],
  
  // System - Administrator (полный), Head of Sales (read-only)
  "/system": ["Administrator", "Head of Sales"],
  "/system/users": ["Administrator"],
  "/system/settings": ["Administrator"],
  "/system/configuration": ["Administrator", "Head of Sales"],
  
  // Newcomers Rating - пока заглушка, доступ как у September Rating
  "/newcomers-rating": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"],
  
  // Profile - доступ всем авторизованным
  "/profile": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales", "Regular User"],
  
  // Общие страницы - доступ всем авторизованным
  "/settings": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales", "Regular User"],

  // Новые/пропущенные корневые разделы
  "/teacher": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"],
  "/administrator": ["Administrator"],
  "/dashboard-cms": ["Administrator"],
  "/dashboard-saas": ["Administrator"],
  "/blank": ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales", "Regular User"],
}

// Страницы только для чтения для Head of Sales
export const READ_ONLY_ROUTES: Record<string, UserRole[]> = {
  "/system/configuration": ["Head of Sales"],
}

// Позволяем переопределять карту через ENV (вариант 3):
// NEXT_PUBLIC_ROUTE_PERMISSIONS_JSON и NEXT_PUBLIC_READ_ONLY_ROUTES_JSON — валидный JSON-объект
function loadFromEnv(): {
  routePermissionsOverride: Record<string, UserRole[]>
  readOnlyRoutesOverride: Record<string, UserRole[]>
} {
  try {
    const r = process.env.NEXT_PUBLIC_ROUTE_PERMISSIONS_JSON
    const ro = process.env.NEXT_PUBLIC_READ_ONLY_ROUTES_JSON
    return {
      routePermissionsOverride: r ? JSON.parse(r) : {},
      readOnlyRoutesOverride: ro ? JSON.parse(ro) : {},
    }
  } catch {
    return { routePermissionsOverride: {}, readOnlyRoutesOverride: {} }
  }
}

// Мердж ENV поверх базовой карты (без мутаций исходников)
const { routePermissionsOverride, readOnlyRoutesOverride } = loadFromEnv()
export const EFFECTIVE_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  ...ROUTE_PERMISSIONS,
  ...routePermissionsOverride,
}
export const EFFECTIVE_READ_ONLY_ROUTES: Record<string, UserRole[]> = {
  ...READ_ONLY_ROUTES,
  ...readOnlyRoutesOverride,
}

/**
 * Проверяет, имеет ли пользователь доступ к маршруту
 */
export function hasAccess(userRole: UserRole | undefined, path: string): boolean {
  if (!userRole) return false
  
  // Проверяем точное совпадение пути
  if (EFFECTIVE_ROUTE_PERMISSIONS[path]) {
    return EFFECTIVE_ROUTE_PERMISSIONS[path].includes(userRole)
  }
  
  // Проверяем родительские пути (например, /system/users -> /system)
  const pathSegments = path.split('/').filter(Boolean)
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const parentPath = '/' + pathSegments.slice(0, i + 1).join('/')
    if (EFFECTIVE_ROUTE_PERMISSIONS[parentPath]) {
      return EFFECTIVE_ROUTE_PERMISSIONS[parentPath].includes(userRole)
    }
  }
  
  return false
}

/**
 * Проверяет, является ли маршрут только для чтения для данной роли
 */
export function isReadOnlyAccess(userRole: UserRole | undefined, path: string): boolean {
  if (!userRole) return false
  return EFFECTIVE_READ_ONLY_ROUTES[path]?.includes(userRole) ?? false
}

/**
 * Получает список доступных модулей для роли
 */
export function getAccessibleModules(userRole: UserRole | undefined): string[] {
  if (!userRole) return []
  
  const modules: string[] = []
  
  if (hasAccess(userRole, "/september-rating")) {
    modules.push("september-rating")
  }
  
  if (hasAccess(userRole, "/mass-kpi-input")) {
    modules.push("mass-kpi-input")
  }
  
  if (hasAccess(userRole, "/newcomers-rating")) {
    modules.push("newcomers-rating")
  }
  
  if (hasAccess(userRole, "/system")) {
    modules.push("system")
  }
  
  return modules
}
