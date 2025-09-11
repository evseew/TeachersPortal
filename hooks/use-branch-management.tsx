"use client"

import { useState, useCallback } from "react"
import { listBranches, createBranch, updateBranch, deleteBranch, type Branch } from "@/lib/api/system"
import { useToast } from "@/hooks/use-toast"

export interface BranchManagementState {
  branches: Branch[]
  loading: boolean
  error: string | null
  isSubmitting: boolean
  editingBranchId: string | null
}

export interface BranchFormData {
  name: string
}

export function useBranchManagement() {
  const [state, setState] = useState<BranchManagementState>({
    branches: [],
    loading: true,
    error: null,
    isSubmitting: false,
    editingBranchId: null,
  })
  
  const { toast } = useToast()

  // Загрузка списка филиалов
  const loadBranches = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const branches = await listBranches()
      setState(prev => ({ ...prev, branches, loading: false }))
    } catch (error: any) {
      const errorMessage = error?.message ?? "Не удалось загрузить филиалы"
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      console.error("Error loading branches:", error)
    }
  }, [])

  // Создание филиала
  const createBranchHandler = useCallback(async (formData: BranchFormData) => {
    const name = formData.name.trim()
    if (!name) {
      toast({ 
        title: "Ошибка валидации", 
        description: "Название филиала не может быть пустым", 
        variant: "destructive" 
      })
      return false
    }

    // Проверка на уникальность названия
    const existingBranch = state.branches.find(
      branch => branch.name.toLowerCase() === name.toLowerCase()
    )
    if (existingBranch) {
      toast({ 
        title: "Ошибка валидации", 
        description: "Филиал с таким названием уже существует", 
        variant: "destructive" 
      })
      return false
    }

    try {
      setState(prev => ({ ...prev, isSubmitting: true }))
      
      // Optimistic update
      const tempBranch: Branch = {
        id: `temp-${Date.now()}`,
        name: name
      }
      setState(prev => ({ 
        ...prev, 
        branches: [...prev.branches, tempBranch]
      }))

      const newBranch = await createBranch(name)
      
      // Заменяем временную запись на реальную
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === tempBranch.id ? newBranch : b
        ),
        isSubmitting: false
      }))

      toast({ 
        title: "Филиал добавлен", 
        description: `«${newBranch.name}» успешно создан` 
      })
      return true
    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.filter(b => !b.id.startsWith('temp-')),
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? "Не удалось создать филиал"
      toast({ 
        title: "Ошибка создания", 
        description: errorMessage, 
        variant: "destructive" 
      })
      console.error("Error creating branch:", error)
      return false
    }
  }, [state.branches, toast])

  // Начало редактирования
  const startEditing = useCallback((branchId: string) => {
    setState(prev => ({ ...prev, editingBranchId: branchId }))
  }, [])

  // Отмена редактирования
  const cancelEditing = useCallback(() => {
    setState(prev => ({ ...prev, editingBranchId: null }))
  }, [])

  // Обновление филиала
  const updateBranchHandler = useCallback(async (branchId: string, formData: BranchFormData) => {
    const name = formData.name.trim()
    if (!name) {
      toast({ 
        title: "Ошибка валидации", 
        description: "Название филиала не может быть пустым", 
        variant: "destructive" 
      })
      return false
    }

    // Проверка на уникальность названия (исключая текущий филиал)
    const existingBranch = state.branches.find(
      branch => branch.id !== branchId && branch.name.toLowerCase() === name.toLowerCase()
    )
    if (existingBranch) {
      toast({ 
        title: "Ошибка валидации", 
        description: "Филиал с таким названием уже существует", 
        variant: "destructive" 
      })
      return false
    }

    try {
      setState(prev => ({ ...prev, isSubmitting: true }))
      
      // Optimistic update
      const oldName = state.branches.find(b => b.id === branchId)?.name
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === branchId ? { ...b, name } : b
        )
      }))

      const updatedBranch = await updateBranch(branchId, name)
      
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === branchId ? updatedBranch : b
        ),
        editingBranchId: null,
        isSubmitting: false
      }))

      toast({ 
        title: "Филиал обновлен", 
        description: `«${updatedBranch.name}» успешно изменен` 
      })
      return true
    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.map(b => 
          b.id === branchId ? { ...b, name: oldName || b.name } : b
        ),
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? "Не удалось обновить филиал"
      toast({ 
        title: "Ошибка обновления", 
        description: errorMessage, 
        variant: "destructive" 
      })
      console.error("Error updating branch:", error)
      return false
    }
  }, [state.branches, toast])

  // Удаление филиала
  const deleteBranchHandler = useCallback(async (branchId: string) => {
    const branch = state.branches.find(b => b.id === branchId)
    if (!branch) return false

    try {
      setState(prev => ({ ...prev, isSubmitting: true }))
      
      // Optimistic update
      const oldBranches = state.branches
      setState(prev => ({ 
        ...prev, 
        branches: prev.branches.filter(b => b.id !== branchId)
      }))

      await deleteBranch(branchId)
      
      setState(prev => ({ ...prev, isSubmitting: false }))
      
      toast({ 
        title: "Филиал удален", 
        description: `«${branch.name}» успешно удален` 
      })
      return true
    } catch (error: any) {
      // Откатываем optimistic update
      setState(prev => ({ 
        ...prev, 
        branches: oldBranches,
        isSubmitting: false
      }))
      
      const errorMessage = error?.message ?? "Не удалось удалить филиал"
      toast({ 
        title: "Ошибка удаления", 
        description: errorMessage, 
        variant: "destructive" 
      })
      console.error("Error deleting branch:", error)
      return false
    }
  }, [state.branches, toast])

  return {
    ...state,
    loadBranches,
    createBranch: createBranchHandler,
    startEditing,
    cancelEditing,
    updateBranch: updateBranchHandler,
    deleteBranch: deleteBranchHandler,
  }
}
