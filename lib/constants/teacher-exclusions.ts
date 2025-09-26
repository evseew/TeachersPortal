/**
 * Константы исключений преподавателей для различных форм
 * 
 * Данные загружены из docs/teacher_exclusions.json
 * Используются для фильтрации преподавателей при отображении рейтингов
 * 
 * ВАЖНО: Исключенные преподаватели НЕ показываются в рейтинге преподавателей,
 * НО учитываются в рейтинге филиалов
 */

export interface TeacherExclusions {
  oldies: string[]
  trial: string[]
}

/**
 * Исключения преподавателей по типам форм
 * Данные загружены из docs/teacher_exclusions.json
 */
export const TEACHER_EXCLUSIONS: TeacherExclusions = {
  "oldies": [
    "Валеев",
    "Якупова", 
    "Булаева",
    "Пасечникова",
    "Михеева",
    "Летуновская",
    "Кригер",
    "Кораблева",
    "Рожкова",
    "Чекунова",
    "Ремпович",
    "Себов",
    "Худякова",
    "Костырева"
  ],
  "trial": [
    "Ремпович"
  ]
}

/**
 * Проверяет, исключен ли преподаватель из указанной формы
 */
export function isTeacherExcluded(teacherName: string, formType: keyof TeacherExclusions): boolean {
  const excludedList = TEACHER_EXCLUSIONS[formType] || []
  
  // Проверяем точное совпадение
  if (excludedList.includes(teacherName)) {
    return true
  }
  
  // Проверяем частичное совпадение (фамилия входит в имя преподавателя)
  const normalizedTeacherName = teacherName.toLowerCase()
  for (const excludedName of excludedList) {
    if (excludedName.toLowerCase() && normalizedTeacherName.includes(excludedName.toLowerCase())) {
      return true
    }
  }
  
  return false
}

/**
 * Возвращает список исключенных преподавателей для указанного типа формы
 */
export function getExcludedTeachers(formType: keyof TeacherExclusions): string[] {
  return [...(TEACHER_EXCLUSIONS[formType] || [])]
}

/**
 * Возвращает все исключения как readonly объект
 */
export function getAllExclusions(): Readonly<TeacherExclusions> {
  return TEACHER_EXCLUSIONS
}

/**
 * Фильтрует список преподавателей, исключая тех, кто в списке исключений
 */
export function filterExcludedTeachers<T extends { name: string }>(
  teachers: T[], 
  formType: keyof TeacherExclusions
): T[] {
  return teachers.filter(teacher => !isTeacherExcluded(teacher.name, formType))
}

/**
 * Фильтрует список преподавателей для отображения в рейтинге
 * Исключает преподавателей из обеих категорий (oldies и trial)
 */
export function filterTeachersForLeaderboard<T extends { name: string }>(teachers: T[]): T[] {
  return teachers.filter(teacher => {
    // Исключаем если преподаватель есть в любом из списков исключений
    return !isTeacherExcluded(teacher.name, 'oldies') && !isTeacherExcluded(teacher.name, 'trial')
  })
}

/**
 * Получает причину исключения преподавателя (для отладки)
 */
export function getExclusionReason(teacherName: string): string | null {
  const reasons: string[] = []
  
  if (isTeacherExcluded(teacherName, 'oldies')) {
    reasons.push('исключен из рейтинга по старичкам')
  }
  
  if (isTeacherExcluded(teacherName, 'trial')) {
    reasons.push('исключен из рейтинга по trial')
  }
  
  return reasons.length > 0 ? reasons.join(', ') : null
}

/**
 * Статистика по исключениям
 */
export function getExclusionStats(): {
  oldiesCount: number
  trialCount: number
  totalUniqueExclusions: number
  overlapping: string[]
} {
  const oldiesList = TEACHER_EXCLUSIONS.oldies || []
  const trialList = TEACHER_EXCLUSIONS.trial || []
  
  // Находим пересечения
  const overlapping = oldiesList.filter(name => trialList.includes(name))
  
  // Подсчитываем уникальных исключенных
  const allExcluded = new Set([...oldiesList, ...trialList])
  
  return {
    oldiesCount: oldiesList.length,
    trialCount: trialList.length,
    totalUniqueExclusions: allExcluded.size,
    overlapping
  }
}

// Экспорт для обратной совместимости
export default TEACHER_EXCLUSIONS
