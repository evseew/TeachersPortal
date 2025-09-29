/**
 * Конфигурация форм Pyrus для плагина September Rating
 * 
 * Централизованное хранение всех ID форм, полей и правил обработки
 * для обеспечения единообразия и упрощения сопровождения
 */

import type { 
  SeptemberFormConfig, 
  TeacherGroupsConfig, 
  FormFieldMapping,
  TeacherGroupRangeConfig
} from '../types/september-rating'

// ===== ID ФОРМ PYRUS =====

export const SEPTEMBER_FORMS = {
  OLDIES_FORM_ID: 2304918,
  TRIAL_FORM_ID: 792300,
  
  FORM_NAMES: {
    2304918: "Возврат студентов (старички)",
    792300: "Конверсия после БПЗ (новый клиент)"
  }
} as const

// ===== МАППИНГ ПОЛЕЙ ФОРМ =====

export const FORM_FIELD_MAPPINGS: Record<number, FormFieldMapping> = {
  // Форма 2304918 (старички) - из reference.md
  [SEPTEMBER_FORMS.OLDIES_FORM_ID]: {
    teacherFieldId: 8,    // Поле с преподавателем
    branchFieldId: 5,     // Поле с филиалом
    studyingFieldId: 64,  // Поле "УЧИТСЯ (заполняет СО)"
    statusFieldId: 7      // Поле со статусом PE
  },
  
  // Форма 792300 (trial) - из reference.md
  [SEPTEMBER_FORMS.TRIAL_FORM_ID]: {
    teacherFieldId: 142,  // Поле с преподавателем
    branchFieldId: 226,   // Поле с филиалом
    studyingFieldId: 187, // Поле "учится"
    statusFieldId: 228    // Поле со статусом PE
  }
}

// ===== КОНФИГУРАЦИЯ ФОРМ =====

export const SEPTEMBER_FORM_CONFIGS: Record<number, SeptemberFormConfig> = {
  [SEPTEMBER_FORMS.OLDIES_FORM_ID]: {
    id: SEPTEMBER_FORMS.OLDIES_FORM_ID,
    name: SEPTEMBER_FORMS.FORM_NAMES[SEPTEMBER_FORMS.OLDIES_FORM_ID],
    fields: FORM_FIELD_MAPPINGS[SEPTEMBER_FORMS.OLDIES_FORM_ID],
    validStatuses: ['PE Start', 'PE Future', 'PE 5'],
    exclusionType: 'oldies'
  },
  
  [SEPTEMBER_FORMS.TRIAL_FORM_ID]: {
    id: SEPTEMBER_FORMS.TRIAL_FORM_ID,
    name: SEPTEMBER_FORMS.FORM_NAMES[SEPTEMBER_FORMS.TRIAL_FORM_ID],
    fields: FORM_FIELD_MAPPINGS[SEPTEMBER_FORMS.TRIAL_FORM_ID],
    validStatuses: ['PE Start', 'PE Future', 'PE 5'],
    exclusionType: 'trial'
  }
}

// ===== ГРУППЫ ПРЕПОДАВАТЕЛЕЙ =====

const OLDIES_RANGES: TeacherGroupRangeConfig[] = [
  {
    key: '35+',
    min: 35,
    max: Infinity,
    emoji: '🥇',
    prizes: ['iPad', 'HonorPad', 'HonorPad', 'HonorPad'],
    winnersCount: 4
  },
  {
    key: '16-34',
    min: 16,
    max: 34,
    emoji: '🥈',
    prize: 'HonorPad',
    winnersCount: 3
  },
  {
    key: '6-15',
    min: 6,
    max: 15,
    emoji: '🥉',
    prize: 'Подписка в Tg Premium',
    winnersCount: 3
  }
]

const TRIAL_RANGES: TeacherGroupRangeConfig[] = [
  {
    key: '16+',
    min: 16,
    max: Infinity,
    emoji: '🥇',
    prizes: ['iPad', 'HonorPad', 'HonorPad', 'HonorPad'],
    winnersCount: 4
  },
  {
    key: '11-15',
    min: 11,
    max: 15,
    emoji: '🥈',
    prize: 'HonorPad',
    winnersCount: 3
  },
  {
    key: '5-10',
    min: 5,
    max: 10,
    emoji: '🥉',
    prize: 'Подписка в Tg Premium',
    winnersCount: 3
  }
]

export const TEACHER_GROUPS_CONFIG: TeacherGroupsConfig = {
  oldies: {
    description: 'Группировка по количеству студентов (форма 2304918)',
    ranges: OLDIES_RANGES,
    sortingRule: 'По % возврата, при равенстве - по количеству студентов'
  },
  trial: {
    description: 'Группировка по количеству БПЗ студентов (форма 792300)',
    ranges: TRIAL_RANGES,
    sortingRule: 'По % конверсии, при равенстве - по количеству БПЗ студентов'
  }
}

// ===== ИСКЛЮЧЕНИЯ =====

export const EXCLUDED_BRANCHES = ['Макеева 15', 'Коммуны 106/1'] as const

export const EXCLUDED_TEACHERS = {
  oldies: ['Валеев', 'Якупова', 'Булаева', 'Пасечникова'],
  trial: ['Ремпович']
} as const

// ===== ПРИЗЫ ДЛЯ ФИЛИАЛОВ =====

export const BRANCH_PRIZES = {
  top_5: {
    1: 'Interactive Display',
    2: 'Кофемашина',
    3: '50,000 руб',
    4: '30,000 руб',
    5: '20,000 руб'
  }
} as const

// ===== ВАЛИДНЫЕ СТАТУСЫ PE =====

export const VALID_PE_STATUSES = ['PE Start', 'PE Future', 'PE 5'] as const

// ===== НАСТРОЙКИ СИНХРОНИЗАЦИИ =====

export const SYNC_CONFIG = {
  CRON_SCHEDULE: '0 * * * *', // Каждый час
  BATCH_SIZE: 200,
  MAX_RETRY_ATTEMPTS: 3,
  TIMEOUT_MS: 30000, // 30 секунд
  DATA_FRESHNESS_THRESHOLD_MS: 2 * 60 * 60 * 1000, // 2 часа
} as const

// ===== УТИЛИТЫ =====

/**
 * Получить конфигурацию формы по ID
 */
export function getFormConfig(formId: number): SeptemberFormConfig | null {
  return SEPTEMBER_FORM_CONFIGS[formId] || null
}

/**
 * Получить маппинг полей формы по ID
 */
export function getFormFieldMapping(formId: number): FormFieldMapping | null {
  return FORM_FIELD_MAPPINGS[formId] || null
}

/**
 * Получить диапазоны групп для типа преподавателей
 */
export function getGroupRanges(groupType: 'oldies' | 'trial'): TeacherGroupRangeConfig[] {
  return TEACHER_GROUPS_CONFIG[groupType].ranges
}

/**
 * Получить группу преподавателя по количеству студентов
 */
export function determineTeacherGroup(
  studentCount: number, 
  groupType: 'oldies' | 'trial'
): string {
  const ranges = getGroupRanges(groupType)
  
  for (const range of ranges) {
    if (studentCount >= range.min && studentCount <= range.max) {
      return range.key
    }
  }
  
  return `under-${ranges[ranges.length - 1].min}`
}

/**
 * Проверить, является ли статус PE валидным
 */
export function isValidPEStatus(status: string): boolean {
  return VALID_PE_STATUSES.includes(status as any)
}

/**
 * Проверить, исключен ли филиал из конкурса
 */
export function isBranchExcluded(branchName: string): boolean {
  return EXCLUDED_BRANCHES.includes(branchName as any)
}

/**
 * Проверить, исключен ли преподаватель из рейтинга
 */
export function isTeacherExcluded(
  teacherName: string, 
  groupType: 'oldies' | 'trial'
): boolean {
  const excludedList = EXCLUDED_TEACHERS[groupType]
  return excludedList.some(excludedName => 
    teacherName.includes(excludedName)
  )
}
