/**
 * Унифицированный хук для работы с филиалами
 * Объединяет функциональность useBranches и useBranchManagement
 * Цель: Единая точка истины для операций с филиалами в UI
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import { BranchService } from '@/lib/services/branch.service'
import type { CreateBranchData, UpdateBranchData } from '@/lib/types/shared'
import { useToast } from '@/hooks/use-toast'
import type { Branch } from '@/lib/types/shared'

export interface BranchOperationsState {
  branches: Branch[]
  loading: boolean
  error: string | null
  isSubmitting: boolean
  editingBranchId: string | null
}

export interface BranchOperationsActions {
  // Загрузка
  refetch: () => Promise<void>
  
  // CRUD операции
  createBranch: (data: CreateBranchData) => Promise<boolean>
  updateBranch: (id: string, data: UpdateBranchData) => Promise<boolean>
  deleteBranch: (id: string) => Promise<boolean>
  
  // UI состояние
  startEditing: (branchId: string) => void
  cancelEditing: () => void
  
  // Вспомогательные
  getBranchById: (id: string) => Branch | undefined
  checkCanDelete: (id: string) => Promise<boolean>
}

export type BranchOperationsReturn = BranchOperationsState & BranchOperationsActions

export function useBranchOperations(): BranchOperationsReturn {
  const [state, setState] = useState<BranchOperationsState>({
    branches: [],
    loading: true,
    error: null,
    isSubmitting: false,
    editingBranchId: null
  })

  const { toast } = useToast()
  const branchService = BranchService.getInstance()

  // Загрузка филиалов
  const loadBranches = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const branches = await branchService.listBranches()
      
      setState(prev => ({ 
        ...prev, 
        branches, 
        loading: false 
      }))
      
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Не удалось загрузить филиалы'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        loading: false 
      }))
      console.error('Error loading branches:', error)
    }
  }, [branchService])

  // Загружаем при монтировании
  useEffect(() => {
    let ignore = false

    const init = async () => {
      await loadBranches()
    }

    init()

    return () => {
      ignore = true
    }
  }, [loadBranches])

  // Refetch функция
  const refetch = useCallback(async () => {
    await loadBranches()
  }, [loadBranches])

  // Создание филиала
  const createBranch = useCallback(async (data: CreateBranchData): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isSubmitting: true }))

      // Optimistic update
      const tempBranch: Branch = {
        id: `temp-${Date.now()}`,
        name: data.name.trim()
      }
      
      setState(prev => ({ 
        ...prev, 
        branches: [...prev.branches, tempBranch]
      }))

      const result = await branchService.createBranch(data)
      
      if (result.success && result.data) {
        // Заменяем временную запись на реальную
        setState(prev => ({ 
          ...prev, 
          branches: prev.branches.map(b => 
            b.id === tempBranch.id ? result.data! : b
          ),
          isSubmitting: false
        }))

        toast({ 
          title: 'Филиал добавлен', 
          description: `«${result.data.name}» успешно создан` 
        })
        
        return true
      } else {
        throw new Error(result.error || 'Unknown error')
      }

    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.filter(b => !b.id.startsWith('temp-')),
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? 'Не удалось создать филиал'
      toast({ 
        title: 'Ошибка создания', 
        description: errorMessage, 
        variant: 'destructive' 
      })
      console.error('Error creating branch:', error)
      return false
    }
  }, [branchService, toast])

  // Обновление филиала
  const updateBranch = useCallback(async (id: string, data: UpdateBranchData): Promise<boolean> => {
    // Сохраняем старое имя для отката
    const oldBranch = state.branches.find(b => b.id === id)
    if (!oldBranch) return false

    try {
      setState(prev => ({ ...prev, isSubmitting: true }))
      
      // Optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === id ? { ...b, name: data.name.trim() } : b
        )
      }))

      const result = await branchService.updateBranch(id, data)
      
      if (result.success && result.data) {
        setState(prev => ({ 
          ...prev, 
          branches: prev.branches.map(b => 
            b.id === id ? result.data! : b
          ),
          editingBranchId: null,
          isSubmitting: false
        }))

        toast({ 
          title: 'Филиал обновлен', 
          description: `«${result.data.name}» успешно изменен` 
        })
        
        return true
      } else {
        throw new Error(result.error || 'Unknown error')
      }

    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === id ? oldBranch : b
        ),
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? 'Не удалось обновить филиал'
      toast({ 
        title: 'Ошибка обновления', 
        description: errorMessage, 
        variant: 'destructive' 
      })
      console.error('Error updating branch:', error)
      return false
    }
  }, [state.branches, branchService, toast])

  // Удаление филиала
  const deleteBranch = useCallback(async (id: string): Promise<boolean> => {
    const branch = state.branches.find(b => b.id === id)
    if (!branch) return false

    // Сохраняем старое состояние для отката
    const oldBranches = state.branches
    
    try {
      setState(prev => ({ ...prev, isSubmitting: true }))
      
      // Optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.filter(b => b.id !== id)
      }))

      const result = await branchService.deleteBranch(id)
      
      if (result.success) {
        setState(prev => ({ ...prev, isSubmitting: false }))
        
        toast({ 
          title: 'Филиал удален', 
          description: `«${branch.name}» успешно удален` 
        })
        
        return true
      } else {
        throw new Error(result.error || 'Unknown error')
      }

    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: oldBranches,
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? 'Не удалось удалить филиал'
      toast({ 
        title: 'Ошибка удаления', 
        description: errorMessage, 
        variant: 'destructive' 
      })
      console.error('Error deleting branch:', error)
      return false
    }
  }, [state.branches, branchService, toast])

  // UI состояние
  const startEditing = useCallback((branchId: string) => {
    setState(prev => ({ ...prev, editingBranchId: branchId }))
  }, [])

  const cancelEditing = useCallback(() => {
    setState(prev => ({ ...prev, editingBranchId: null }))
  }, [])

  // Вспомогательные функции
  const getBranchById = useCallback((id: string): Branch | undefined => {
    return state.branches.find(b => b.id === id)
  }, [state.branches])

  const checkCanDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      const usageInfo = await branchService.checkBranchUsage(id)
      return usageInfo.canDelete
    } catch (error) {
      console.error('Error checking branch deletion:', error)
      return false
    }
  }, [branchService])

  return {
    // Состояние
    branches: state.branches,
    loading: state.loading,
    error: state.error,
    isSubmitting: state.isSubmitting,
    editingBranchId: state.editingBranchId,
    
    // Действия
    refetch,
    createBranch,
    updateBranch,
    deleteBranch,
    startEditing,
    cancelEditing,
    getBranchById,
    checkCanDelete
  }
}
