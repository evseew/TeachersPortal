/**
 * Унифицированный сервис для работы с филиалами
 * Заменяет дублирующуюся логику в use-branches и use-branch-management
 * Цель: Единая точка истины для операций с филиалами
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Branch, BranchUsageInfo } from '@/lib/api/system'

export interface CreateBranchData {
  name: string
}

export interface UpdateBranchData {
  name: string
}

export interface BranchValidationResult {
  isValid: boolean
  error?: string
}

export interface BranchOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class BranchService {
  private static instance: BranchService

  static getInstance(): BranchService {
    if (!BranchService.instance) {
      BranchService.instance = new BranchService()
    }
    return BranchService.instance
  }

  /**
   * Загружает все филиалы
   * Единая точка загрузки для всех компонентов
   */
  async listBranches(): Promise<Branch[]> {
    try {
      console.log('🏢 BranchService: Загружаем список филиалов...')
      
      const { data, error } = await supabaseAdmin
        .from('branch')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error

      console.log(`✅ BranchService: Загружено ${data?.length || 0} филиалов`)
      return data || []

    } catch (error: any) {
      console.error('❌ BranchService: Ошибка загрузки филиалов:', error)
      throw new Error(`Failed to load branches: ${error.message}`)
    }
  }

  /**
   * Создает новый филиал с валидацией
   */
  async createBranch(data: CreateBranchData): Promise<BranchOperationResult<Branch>> {
    try {
      console.log(`🏢 BranchService: Создаем филиал "${data.name}"...`)

      // Валидация
      const validation = await this.validateBranchData(data.name)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Проверка уникальности
      const uniqueCheck = await this.checkNameUniqueness(data.name)
      if (!uniqueCheck.isValid) {
        return {
          success: false,
          error: uniqueCheck.error
        }
      }

      // Создание
      const { data: newBranch, error } = await supabaseAdmin
        .from('branch')
        .insert({ name: data.name.trim() })
        .select('id, name')
        .single()

      if (error) throw error

      console.log(`✅ BranchService: Филиал "${newBranch.name}" создан с ID ${newBranch.id}`)

      return {
        success: true,
        data: newBranch
      }

    } catch (error: any) {
      console.error('❌ BranchService: Ошибка создания филиала:', error)
      return {
        success: false,
        error: `Failed to create branch: ${error.message}`
      }
    }
  }

  /**
   * Обновляет филиал с валидацией
   */
  async updateBranch(id: string, data: UpdateBranchData): Promise<BranchOperationResult<Branch>> {
    try {
      console.log(`🏢 BranchService: Обновляем филиал ${id} -> "${data.name}"...`)

      // Валидация данных
      const validation = await this.validateBranchData(data.name)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Проверка уникальности (исключая текущий филиал)
      const uniqueCheck = await this.checkNameUniqueness(data.name, id)
      if (!uniqueCheck.isValid) {
        return {
          success: false,
          error: uniqueCheck.error
        }
      }

      // Проверка существования филиала
      const existsCheck = await this.checkBranchExists(id)
      if (!existsCheck.isValid) {
        return {
          success: false,
          error: existsCheck.error
        }
      }

      // Обновление
      const { data: updatedBranch, error } = await supabaseAdmin
        .from('branch')
        .update({ name: data.name.trim() })
        .eq('id', id)
        .select('id, name')
        .single()

      if (error) throw error

      console.log(`✅ BranchService: Филиал обновлен: ${updatedBranch.name}`)

      return {
        success: true,
        data: updatedBranch
      }

    } catch (error: any) {
      console.error('❌ BranchService: Ошибка обновления филиала:', error)
      return {
        success: false,
        error: `Failed to update branch: ${error.message}`
      }
    }
  }

  /**
   * Удаляет филиал с проверкой зависимостей
   */
  async deleteBranch(id: string): Promise<BranchOperationResult<void>> {
    try {
      console.log(`🏢 BranchService: Проверяем возможность удаления филиала ${id}...`)

      // Проверка использования филиала
      const usageInfo = await this.checkBranchUsage(id)
      if (!usageInfo.canDelete) {
        return {
          success: false,
          error: `Cannot delete branch: ${usageInfo.linkedRecords.profiles} profiles and ${usageInfo.linkedRecords.metrics} metrics are linked to this branch`
        }
      }

      // Удаление
      const { error } = await supabaseAdmin
        .from('branch')
        .delete()
        .eq('id', id)

      if (error) throw error

      console.log(`✅ BranchService: Филиал ${id} удален`)

      return { success: true }

    } catch (error: any) {
      console.error('❌ BranchService: Ошибка удаления филиала:', error)
      return {
        success: false,
        error: `Failed to delete branch: ${error.message}`
      }
    }
  }

  /**
   * Проверяет использование филиала
   */
  async checkBranchUsage(id: string): Promise<BranchUsageInfo> {
    try {
      // Проверяем связанные профили
      const { data: linkedProfiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('branch_id', id)

      if (profilesError) throw profilesError

      // Проверяем связанные метрики
      const { data: linkedMetrics, error: metricsError } = await supabaseAdmin
        .from('teacher_metrics')
        .select('teacher_id')
        .eq('branch_id', id)

      if (metricsError) throw metricsError

      const profileDetails = (linkedProfiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Без имени',
        email: p.email
      }))

      const canDelete = (linkedProfiles?.length || 0) === 0 && (linkedMetrics?.length || 0) === 0

      return {
        canDelete,
        linkedRecords: {
          profiles: linkedProfiles?.length || 0,
          metrics: linkedMetrics?.length || 0,
          profileDetails
        }
      }

    } catch (error: any) {
      console.error('❌ BranchService: Ошибка проверки использования:', error)
      
      // При ошибке считаем что филиал нельзя удалить (безопасность)
      return {
        canDelete: false,
        linkedRecords: {
          profiles: -1,
          metrics: -1,
          profileDetails: []
        }
      }
    }
  }

  /**
   * Валидирует данные филиала
   */
  private async validateBranchData(name: string): Promise<BranchValidationResult> {
    const trimmedName = name?.trim()

    if (!trimmedName) {
      return {
        isValid: false,
        error: 'Название филиала не может быть пустым'
      }
    }

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        error: 'Название филиала должно содержать минимум 2 символа'
      }
    }

    if (trimmedName.length > 100) {
      return {
        isValid: false,
        error: 'Название филиала не может превышать 100 символов'
      }
    }

    // Проверка на недопустимые символы
    const invalidChars = /[<>\"'&]/
    if (invalidChars.test(trimmedName)) {
      return {
        isValid: false,
        error: 'Название филиала содержит недопустимые символы'
      }
    }

    return { isValid: true }
  }

  /**
   * Проверяет уникальность названия филиала
   */
  private async checkNameUniqueness(name: string, excludeId?: string): Promise<BranchValidationResult> {
    try {
      let query = supabaseAdmin
        .from('branch')
        .select('id, name')
        .ilike('name', name.trim())

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        return {
          isValid: false,
          error: 'Филиал с таким названием уже существует'
        }
      }

      return { isValid: true }

    } catch (error: any) {
      console.error('❌ Error checking name uniqueness:', error)
      return {
        isValid: false,
        error: 'Ошибка проверки уникальности названия'
      }
    }
  }

  /**
   * Проверяет существование филиала
   */
  private async checkBranchExists(id: string): Promise<BranchValidationResult> {
    try {
      const { data, error } = await supabaseAdmin
        .from('branch')
        .select('id')
        .eq('id', id)
        .single()

      if (error || !data) {
        return {
          isValid: false,
          error: 'Филиал не найден'
        }
      }

      return { isValid: true }

    } catch (error: any) {
      return {
        isValid: false,
        error: 'Ошибка проверки существования филиала'
      }
    }
  }

  /**
   * Получает филиал по ID
   */
  async getBranchById(id: string): Promise<BranchOperationResult<Branch>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('branch')
        .select('id, name')
        .eq('id', id)
        .single()

      if (error) throw error

      return {
        success: true,
        data
      }

    } catch (error: any) {
      return {
        success: false,
        error: `Branch not found: ${error.message}`
      }
    }
  }

  /**
   * Получает статистику по филиалам
   */
  async getBranchesStats(): Promise<{
    totalBranches: number
    branchesWithTeachers: number
    averageTeachersPerBranch: number
  }> {
    try {
      // Общее количество филиалов
      const { count: totalBranches } = await supabaseAdmin
        .from('branch')
        .select('*', { count: 'exact', head: true })

      // Филиалы с преподавателями
      const { data: branchesWithTeachers } = await supabaseAdmin
        .from('profiles')
        .select('branch_id')
        .eq('role', 'Teacher')
        .not('branch_id', 'is', null)

      const uniqueBranches = new Set(branchesWithTeachers?.map(p => p.branch_id) || [])
      const branchesWithTeachersCount = uniqueBranches.size

      const averageTeachersPerBranch = branchesWithTeachersCount > 0 
        ? Math.round((branchesWithTeachers?.length || 0) / branchesWithTeachersCount)
        : 0

      return {
        totalBranches: totalBranches || 0,
        branchesWithTeachers: branchesWithTeachersCount,
        averageTeachersPerBranch
      }

    } catch (error: any) {
      console.error('❌ Error getting branches stats:', error)
      return {
        totalBranches: 0,
        branchesWithTeachers: 0,
        averageTeachersPerBranch: 0
      }
    }
  }
}
