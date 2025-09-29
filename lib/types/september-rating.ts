/**
 * Типы данных для плагина September Rating
 * 
 * Содержит все интерфейсы для работы с данными рейтинга за сентябрь 2024,
 * включая синхронизацию из Pyrus, обработку статистики и UI компоненты
 */

// ===== БАЗОВЫЕ ТИПЫ =====

export type TeacherGroupType = 'oldies' | 'trial'

export type OldiesGroupRange = '35+' | '16-34' | '6-15' | 'under-6'
export type TrialGroupRange = '16+' | '11-15' | '5-10' | 'under-5'
export type TeacherGroupRangeString = OldiesGroupRange | TrialGroupRange

export type SyncStep = 'auth' | 'form_2304918' | 'form_792300' | 'exclusions' | 'calculations' | 'save' | 'complete'
export type SyncStatus = 'success' | 'error' | 'running' | 'pending'

// ===== ДАННЫЕ ПРЕПОДАВАТЕЛЕЙ =====

export interface SeptemberTeacherStats {
  teacherId: string
  name: string
  branchName: string
  category: 'Senior' | 'Middle' | 'Junior'
  
  // Данные по старичкам (форма 2304918)
  oldiesData: {
    total: number
    returned: number
    percentage: number
    group: OldiesGroupRange
  }
  
  // Данные по trial (форма 792300)
  trialData: {
    total: number
    converted: number
    percentage: number
    group: TrialGroupRange
  }
  
  // Общие метрики
  combinedScore: number
  rank: number
  deltaScore: number
  
  // Мета-данные
  isExcluded: boolean
  lastUpdated: Date
}

export interface SeptemberBranchStats {
  branchName: string
  branchId: string
  
  // Агрегированные данные по старичкам
  oldiesData: {
    total: number
    returned: number
    percentage: number
    teachersCount: number
  }
  
  // Агрегированные данные по trial
  trialData: {
    total: number
    converted: number
    percentage: number
    teachersCount: number
  }
  
  // Общие метрики филиала
  combinedScore: number
  rank: number
  deltaScore: number
  isExcludedFromCompetition: boolean
  
  // Детальная статистика
  teachers: SeptemberTeacherStats[]
  lastUpdated: Date
}

// ===== КОНФИГУРАЦИЯ ФОРМ =====

export interface FormFieldMapping {
  teacherFieldId: number
  branchFieldId: number
  studyingFieldId: number
  statusFieldId: number
}

export interface SeptemberFormConfig {
  id: number
  name: string
  fields: FormFieldMapping
  validStatuses: string[]
  exclusionType: TeacherGroupType
}

export interface TeacherGroupRangeConfig {
  key: string
  min: number
  max: number
  emoji: string
  prize?: string
  prizes?: string[]
  winnersCount: number
}

export interface TeacherGroupsConfig {
  oldies: {
    description: string
    ranges: TeacherGroupRangeConfig[]
    sortingRule: string
  }
  trial: {
    description: string
    ranges: TeacherGroupRangeConfig[]
    sortingRule: string
  }
}

// ===== СИНХРОНИЗАЦИЯ =====

export interface SyncProgressStep {
  step: SyncStep
  progress: number // 0-100
  message: string
  details?: {
    currentRecord?: number
    totalRecords?: number
    formName?: string
    teachersProcessed?: number
    errorsCount?: number
    warningsCount?: number
  }
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsUpdated: number
  startedAt: Date
  completedAt?: Date
  errors?: string[]
  warnings?: string[]
  duration?: number
  initiatedBy?: string
}

export interface DetailedSyncStatus {
  lastSync?: {
    timestamp: Date
    success: boolean
    duration: number
    recordsProcessed: number
    recordsUpdated: number
    errors: string[]
    warnings: string[]
  }
  formsStatus: {
    oldies: FormSyncStatus
    trial: FormSyncStatus
  }
  dataFreshness: {
    oldies: 'fresh' | 'stale' | 'outdated'
    trial: 'fresh' | 'stale' | 'outdated'
  }
  nextScheduledSync?: Date
  isRunning: boolean
  currentStep?: SyncProgressStep
}

export interface FormSyncStatus {
  lastUpdate?: Date
  recordCount: number
  errors: string[]
  warnings: string[]
  status: SyncStatus
}

// ===== БАЗА ДАННЫХ =====

export interface SeptemberSyncLogEntry {
  id: number
  startedAt: Date
  completedAt?: Date
  success: boolean
  recordsProcessed: number
  recordsUpdated: number
  errors?: Record<string, unknown>
  warnings?: Record<string, unknown>
  initiatedBy?: string
  duration?: number
  createdAt: Date
}

export interface TeacherMetricsRow {
  id: number
  teacherId: string
  teacherName: string
  branchName: string
  branchId?: string
  lastYearBase: number
  lastYearReturned: number
  trialTotal: number
  trialConverted: number
  combinedScore: number
  rank: number
  deltaScore: number
  category: string
  isExcluded: boolean
  updatedAt: Date
  createdAt: Date
}

// ===== UI КОМПОНЕНТЫ =====

export interface TeacherLeaderboardProps {
  showOnlyCards?: boolean
  maxItems?: number
  groupType?: TeacherGroupType
  branchFilter?: string
  categoryFilter?: string
}

export interface BranchLeaderboardProps {
  showOnlyCards?: boolean
  maxItems?: number
  excludeCompetition?: boolean
}

export interface SyncButtonProps {
  onSyncStart?: () => void
  onSyncComplete?: (result: SyncResult) => void
  onSyncError?: (error: string) => void
  showDetails?: boolean
}

export interface SyncInfoProps {
  refreshInterval?: number
  showDetailedStatus?: boolean
}

// ===== API RESPONSES =====

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface SyncApiResponse extends ApiResponse<SyncResult> {
  progress?: SyncProgressStep
}

export interface LeaderboardApiResponse extends ApiResponse<{
  teachers: SeptemberTeacherStats[]
  branches: SeptemberBranchStats[]
  lastUpdated: Date
  totalCount: number
}> {}

export interface SyncStatusApiResponse extends ApiResponse<DetailedSyncStatus> {}

// ===== ХУКИ =====

export interface UseSyncSeptemberRatingResult {
  isLoading: boolean
  lastResult: SyncResult | null
  error: string | null
  progress: SyncProgressStep | null
  
  // Методы
  startSync: () => Promise<SyncResult>
  getStatus: () => Promise<DetailedSyncStatus>
  clearError: () => void
  cancelSync: () => Promise<void>
}

export interface UseTeacherLeaderboardResult {
  teachers: SeptemberTeacherStats[]
  branches: SeptemberBranchStats[]
  loading: boolean
  error: string | null
  lastUpdated?: Date
  
  // Методы
  refresh: () => Promise<void>
  filterByBranch: (branchName: string) => void
  filterByCategory: (category: string) => void
  filterByGroup: (group: TeacherGroupRange) => void
}

// ===== УТИЛИТЫ =====

export interface GroupingUtils {
  getTeacherGroup: (teacher: SeptemberTeacherStats, groupType: TeacherGroupType) => TeacherGroupRange
  calculateCombinedScore: (oldiesPercent: number, trialPercent: number) => number
  sortTeachersByGroup: (teachers: SeptemberTeacherStats[], groupType: TeacherGroupType) => Record<string, SeptemberTeacherStats[]>
  applyExclusions: (teachers: SeptemberTeacherStats[], exclusions: string[]) => SeptemberTeacherStats[]
}

// ===== КОНСТАНТЫ =====

export const SEPTEMBER_CONSTANTS = {
  FORMS: {
    OLDIES_ID: 2304918,
    TRIAL_ID: 792300
  },
  SYNC_INTERVAL_CRON: '0 * * * *', // Каждый час
  DATA_FRESHNESS_THRESHOLD: 2 * 60 * 60 * 1000, // 2 часа в миллисекундах
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 200
} as const

export const VALID_PE_STATUSES = ['PE Start', 'PE Future', 'PE 5'] as const
export const EXCLUDED_BRANCHES = ['Макеева 15', 'Коммуны 106/1'] as const

// ===== TYPE GUARDS =====

export function isSeptemberTeacherStats(obj: unknown): obj is SeptemberTeacherStats {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'teacherId' in obj &&
    'name' in obj &&
    'oldiesData' in obj &&
    'trialData' in obj
  )
}

export function isSyncResult(obj: unknown): obj is SyncResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'recordsProcessed' in obj &&
    'startedAt' in obj
  )
}

export function isValidGroupType(value: string): value is TeacherGroupType {
  return value === 'oldies' || value === 'trial'
}

export function isValidSyncStep(value: string): value is SyncStep {
  const validSteps: SyncStep[] = ['auth', 'form_2304918', 'form_792300', 'exclusions', 'calculations', 'save', 'complete']
  return validSteps.includes(value as SyncStep)
}
