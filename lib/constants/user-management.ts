export const USER_ROLES = ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales", "Regular User"] as const
export const TEACHER_CATEGORIES = ["Partner", "Senior", "Middle", "Junior", "Newcomer"] as const

// Захардкоженные email'ы администраторов - автоматически получают роль Administrator при любом развертывании
export const ADMIN_EMAILS = ["info@planetenglish.ru", "dev@planetenglish.ru"] as const

export type UserRole = typeof USER_ROLES[number]
export type TeacherCategory = typeof TEACHER_CATEGORIES[number]

export function isTeacherRole(role: string): boolean {
  return role === "Teacher"  // Senior Teacher это менеджер, не преподаватель
}

export function isManagerRole(role: string): boolean {
  return role === "Senior Teacher" || role === "Head of Sales" || role === "Administrator"
}
