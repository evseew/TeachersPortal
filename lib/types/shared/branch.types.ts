/**
 * Типы для работы с филиалами
 * Централизованное место для всех типов, связанных с филиалами
 */

export type Branch = { 
  id: string
  name: string 
}

export interface BranchUsageInfo {
  canDelete: boolean
  linkedRecords: {
    profiles: number
    metrics: number
    profileDetails: Array<{ user_id: string; full_name: string; email: string }>
  }
}

export interface CreateBranchData {
  name: string
}

export interface UpdateBranchData {
  name: string
}
