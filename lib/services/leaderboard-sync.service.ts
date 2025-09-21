/**
 * Унифицированный сервис для синхронизации лидербордов
 * Объединяет дублирующуюся логику из sync-users и sync-leaderboard
 * Цель: Единая точка истины для синхронизации
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface SyncResult {
  success: boolean
  teachersInProfiles: number
  phantomUsersRemoved: number
  missingTeachersAdded: number
  finalTeacherCount: number
  details: {
    phantomsRemoved: string[]
    teachersAdded: Array<{ id: string; name: string }>
  }
  error?: string
}

export interface LeaderboardTeacher {
  user_id: string
  full_name: string | null
  email: string
  role: string
  category: string | null
  branch_id: string | null
}

export class LeaderboardSyncService {
  /**
   * Основная функция синхронизации лидербордов
   * Заменяет дублирующуюся логику в sync-users и sync-leaderboard
   */
  async syncTeacherData(): Promise<SyncResult> {
    try {
      console.log('🔄 LeaderboardSyncService: Начинаем синхронизацию...')

      // 1. Получаем всех преподавателей из profiles
      const teachers = await this.getTeachersFromProfiles()
      console.log(`📊 Получено ${teachers.length} преподавателей из profiles`)

      // 2. Получаем текущие данные из current_scores
      const currentScores = await this.getCurrentScores()
      console.log(`📊 Текущих записей в current_scores: ${currentScores.length}`)

      // 3. Находим и удаляем фантомных пользователей
      const phantomUsers = await this.findAndRemovePhantomUsers(teachers, currentScores)
      
      // 4. Находим и добавляем отсутствующих преподавателей
      const missingTeachers = await this.findAndAddMissingTeachers(teachers, currentScores)

      // 5. Синхронизируем branch_id для всех преподавателей
      await this.syncBranchIds(teachers)

      // 6. Пересчитываем рейтинги
      await this.recomputeScores()

      // 7. Получаем финальные данные
      const finalScores = await this.getCurrentScores()

      const result: SyncResult = {
        success: true,
        teachersInProfiles: teachers.length,
        phantomUsersRemoved: phantomUsers.length,
        missingTeachersAdded: missingTeachers.length,
        finalTeacherCount: finalScores.length,
        details: {
          phantomsRemoved: phantomUsers.map(p => p.teacher_id),
          teachersAdded: missingTeachers.map(t => ({ 
            id: t.user_id, 
            name: t.full_name || t.email 
          }))
        }
      }

      console.log('✅ LeaderboardSyncService: Синхронизация завершена', result)
      return result

    } catch (error: any) {
      console.error('❌ LeaderboardSyncService: Ошибка синхронизации:', error)
      
      return {
        success: false,
        teachersInProfiles: 0,
        phantomUsersRemoved: 0,
        missingTeachersAdded: 0,
        finalTeacherCount: 0,
        details: { phantomsRemoved: [], teachersAdded: [] },
        error: error.message || 'Unknown sync error'
      }
    }
  }

  /**
   * Получает всех преподавателей из таблицы profiles
   */
  private async getTeachersFromProfiles(): Promise<LeaderboardTeacher[]> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, role, category, branch_id')
      .eq('role', 'Teacher')
      .order('full_name')

    if (error) throw error
    return data || []
  }

  /**
   * Получает текущие записи из current_scores для преподавателей
   */
  private async getCurrentScores() {
    const { data, error } = await supabaseAdmin
      .from('current_scores')
      .select('teacher_id, score, rank')
      .eq('scope', 'teacher_overall')
      .eq('context', 'all')
      .not('teacher_id', 'is', null)

    if (error) throw error
    return data || []
  }

  /**
   * Находит и удаляет фантомных пользователей
   * (есть в current_scores, но нет в profiles)
   */
  private async findAndRemovePhantomUsers(
    teachers: LeaderboardTeacher[], 
    currentScores: any[]
  ) {
    const teacherIds = new Set(teachers.map(t => t.user_id))
    const phantomScores = currentScores.filter(cs => !teacherIds.has(cs.teacher_id))

    if (phantomScores.length > 0) {
      console.log(`🗑️ Найдено ${phantomScores.length} фантомных пользователей`)
      
      const phantomIds = phantomScores.map(ps => ps.teacher_id)
      const { error } = await supabaseAdmin
        .from('current_scores')
        .delete()
        .eq('scope', 'teacher_overall')
        .eq('context', 'all')
        .in('teacher_id', phantomIds)

      if (error) throw error
      console.log('✅ Фантомные пользователи удалены')
    }

    return phantomScores
  }

  /**
   * Находит и добавляет отсутствующих преподавателей
   * (есть в profiles, но нет в current_scores/teacher_metrics)
   */
  private async findAndAddMissingTeachers(
    teachers: LeaderboardTeacher[],
    currentScores: any[]
  ) {
    const existingTeacherIds = new Set(currentScores.map(cs => cs.teacher_id))
    const missingTeachers = teachers.filter(t => !existingTeacherIds.has(t.user_id))

    if (missingTeachers.length > 0) {
      console.log(`➕ Найдено ${missingTeachers.length} отсутствующих преподавателей`)

      // Добавляем в teacher_metrics (если нет)
      for (const teacher of missingTeachers) {
        const { error } = await supabaseAdmin
          .from('teacher_metrics')
          .upsert({
            teacher_id: teacher.user_id,
            branch_id: teacher.branch_id,
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0,
            updated_by: 'leaderboard-sync-service'
          }, { onConflict: 'teacher_id' })

        if (error) {
          console.error(`❌ Ошибка upsert метрик для ${teacher.full_name}:`, error)
        }
      }

      console.log('✅ Отсутствующие преподаватели добавлены в teacher_metrics')
    }

    return missingTeachers
  }

  /**
   * Синхронизирует branch_id для всех преподавателей
   * Обеспечивает консистентность между profiles.branch_id и teacher_metrics.branch_id
   */
  private async syncBranchIds(teachers: LeaderboardTeacher[]) {
    console.log('🔄 Синхронизируем branch_id для всех преподавателей...')

    for (const teacher of teachers) {
      const { error } = await supabaseAdmin
        .from('teacher_metrics')
        .update({
          branch_id: teacher.branch_id,
          updated_by: 'branch-sync'
        })
        .eq('teacher_id', teacher.user_id)

      if (error) {
        console.error(`❌ Ошибка обновления branch_id для ${teacher.full_name}:`, error)
      }
    }

    console.log('✅ branch_id синхронизированы')
  }

  /**
   * Запускает пересчет рейтингов
   */
  private async recomputeScores() {
    console.log('🔄 Пересчитываем рейтинги...')
    
    const { error } = await supabaseAdmin.rpc('recompute_current_scores')
    if (error) throw error
    
    console.log('✅ Рейтинги пересчитаны')
  }

  /**
   * Удаляет только фантомных пользователей
   * Отдельная функция для независимого использования
   */
  async removePhantomUsers(): Promise<{ removed: number; phantomIds: string[] }> {
    const teachers = await this.getTeachersFromProfiles()
    const currentScores = await this.getCurrentScores()
    const phantomUsers = await this.findAndRemovePhantomUsers(teachers, currentScores)

    return {
      removed: phantomUsers.length,
      phantomIds: phantomUsers.map(p => p.teacher_id)
    }
  }

  /**
   * Добавляет только отсутствующих преподавателей
   * Отдельная функция для независимого использования
   */
  async addMissingTeachers(): Promise<{ added: number; teacherIds: string[] }> {
    const teachers = await this.getTeachersFromProfiles()
    const currentScores = await this.getCurrentScores()
    const missingTeachers = await this.findAndAddMissingTeachers(teachers, currentScores)

    // Пересчитываем рейтинги после добавления
    await this.recomputeScores()

    return {
      added: missingTeachers.length,
      teacherIds: missingTeachers.map(t => t.user_id)
    }
  }
}
