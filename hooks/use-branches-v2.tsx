/**
 * Backward compatibility для useBranches
 * Использует новый useBranchOperations внутри, но сохраняет старый API
 */

"use client"

import { useBranchOperations } from './use-branch-operations'
import type { Branch } from '@/lib/api/system'

export interface UseBranchesReturn {
  branches: Branch[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBranchesV2(): UseBranchesReturn {
  const branchOps = useBranchOperations()

  // Возвращаем только subset функций для совместимости с старым API
  return {
    branches: branchOps.branches,
    loading: branchOps.loading,
    error: branchOps.error,
    refetch: branchOps.refetch
  }
}
