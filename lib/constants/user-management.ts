export const USER_ROLES = ["Administrator", "Senior Teacher", "Teacher", "Salesman", "Head of Sales"] as const
export const TEACHER_CATEGORIES = ["Partner", "Senior", "Middle", "Junior", "Newcomer"] as const

export type UserRole = typeof USER_ROLES[number]
export type TeacherCategory = typeof TEACHER_CATEGORIES[number]

export function isTeacherRole(role: string): boolean {
  return role === "Teacher" || role === "Senior Teacher"
}
