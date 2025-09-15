/**
 * Backward compatibility для useBranchManagement
 * Использует новый useBranchOperations внутри, но сохраняет старый API
 */

"use client"

import { useBranchOperations } from './use-branch-operations'
import type { Branch } from '@/lib/types/shared'

export interface BranchFormData {
  name: string
}

export interface BranchManagementState {
  branches: Branch[]
  loading: boolean
  error: string | null
  isSubmitting: boolean
  editingBranchId: string | null
}

export interface UseBranchManagementReturn extends BranchManagementState {
  loadBranches: () => Promise<void>
  createBranch: (data: BranchFormData) => Promise<boolean>
  updateBranch: (id: string, data: BranchFormData) => Promise<boolean>
  deleteBranch: (id: string) => Promise<boolean>
  startEditing: (branchId: string) => void
  cancelEditing: () => void
}

export function useBranchManagementV2(): UseBranchManagementReturn {
  const branchOps = useBranchOperations()

  // Возвращаем API совместимый со старым useBranchManagement
  return {
    // Состояние
    branches: branchOps.branches,
    loading: branchOps.loading,
    error: branchOps.error,
    isSubmitting: branchOps.isSubmitting,
    editingBranchId: branchOps.editingBranchId,
    
    // Действия (с переименованием для совместимости)
    loadBranches: branchOps.refetch, // Алиас для старого API
    createBranch: branchOps.createBranch,
    updateBranch: branchOps.updateBranch,
    deleteBranch: branchOps.deleteBranch,
    startEditing: branchOps.startEditing,
    cancelEditing: branchOps.cancelEditing
  }
}
