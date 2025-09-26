/**
 * Сервис синхронизации данных из Pyrus в базу данных портала
 * 
 * Основные возможности:
 * - Синхронизация форм 2304918 (старички) и 792300 (trial)
 * - Применение исключений преподавателей
 * - Группировка данных по филиалам из форм
 * - Обновление таблиц teacher_metrics и current_scores
 */

import { PyrusFormsClient } from '../pyrus/forms-client'
import { PyrusTeachersClient, TeacherData } from '../pyrus/teachers-client'
import { isTeacherExcluded } from '../constants/teacher-exclusions'
import { supabaseAdmin } from '../supabase/admin'

export interface TeacherMetrics {
  teacher_name: string
  branch_name: string
  last_year_base: number
  last_year_returned: number
  trial_total: number
  trial_converted: number
  branch_id: string | null // NULL для рейтинга преподавателей
}

export interface BranchMetrics {
  branch_name: string
  last_year_base: number
  last_year_returned: number
  trial_total: number
  trial_converted: number
}

export interface SyncResult {
  success: boolean
  teachersProcessed: number
  branchesProcessed: number
  errors: string[]
  startTime: Date
  endTime: Date
  duration: number
}

export interface FormFieldMapping {
  teacherFieldId: number
  branchFieldId: number
  studyingFieldId: number
  statusFieldId: number
}

export class PyrusSyncService {
  private formsClient: PyrusFormsClient
  private teachersClient: PyrusTeachersClient

  // Маппинг полей для форм (из reference.md)
  private readonly FORM_2304918_FIELDS: FormFieldMapping = {
    teacherFieldId: 8,    // Поле с преподавателем
    branchFieldId: 5,     // Поле с филиалом
    studyingFieldId: 64,  // Поле "УЧИТСЯ (заполняет СО)"
    statusFieldId: 7      // Поле со статусом PE
  }

  private readonly FORM_792300_FIELDS: FormFieldMapping = {
    teacherFieldId: 142,  // Поле с преподавателем
    branchFieldId: 226,   // Поле с филиалом
    studyingFieldId: 187, // Поле "учится"
    statusFieldId: 228    // Поле со статусом PE
  }

  constructor(
    formsClient: PyrusFormsClient,
    teachersClient: PyrusTeachersClient
  ) {
    this.formsClient = formsClient
    this.teachersClient = teachersClient
  }

  /**
   * Синхронизация формы 2304918 (старички)
   */
  async syncForm2304918(): Promise<TeacherMetrics[]> {
    console.log('PyrusSyncService: начинаем синхронизацию формы 2304918 (старички)')
    
    const teacherMetrics = new Map<string, TeacherMetrics>()
    const branchMetrics = new Map<string, BranchMetrics>()
    
    let processedTasks = 0
    let validTasks = 0
    let excludedTasks = 0

    try {
      // Итерируемся по всем задачам формы
      for await (const task of this.formsClient.iterRegisterTasks(2304918, { 
        includeArchived: false,
        batchSize: 200 
      })) {
        processedTasks++
        
        if (processedTasks % 500 === 0) {
          console.log(`PyrusSyncService: обработано ${processedTasks} задач формы 2304918`)
        }

        const taskFields = task.fields || []
        const taskId = task.id
        const taskStatus = task.status || ''

        // ФИЛЬТР: Пропускаем закрытые/завершенные задачи согласно Pyrus API
        if (taskStatus.toLowerCase().includes('closed') || 
            taskStatus.toLowerCase().includes('completed') ||
            taskStatus.toLowerCase().includes('finished') ||
            taskStatus.toLowerCase().includes('cancelled')) {
          continue
        }

        // Извлекаем данные преподавателя
        let teacherData: TeacherData
        try {
          teacherData = this.teachersClient.extractTeacherData(
            taskFields,
            taskId,
            this.FORM_2304918_FIELDS
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'EXCLUDED_BRANCH') {
            continue // Пропускаем исключенные филиалы
          }
          console.warn(`PyrusSyncService: ошибка извлечения данных из задачи ${taskId}:`, error)
          continue
        }

        // Проверяем валидность данных
        const validation = this.teachersClient.validateTeacherData(teacherData)
        if (!validation.isValid) {
          continue // Пропускаем невалидные данные
        }

        validTasks++

        // ВСЕГДА учитываем в статистике филиала (даже исключенных преподавателей)
        if (!branchMetrics.has(teacherData.branch)) {
          branchMetrics.set(teacherData.branch, {
            branch_name: teacherData.branch,
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0
          })
        }

        const branchStats = branchMetrics.get(teacherData.branch)!
        branchStats.last_year_base++
        if (teacherData.isStudying) {
          branchStats.last_year_returned++
        }

        // Проверяем исключения для старичков - только для статистики преподавателей
        if (this.isTeacherExcluded(teacherData.name, 'oldies')) {
          excludedTasks++
          continue // Не добавляем в статистику преподавателей
        }

        // Инициализируем статистику преподавателя
        if (!teacherMetrics.has(teacherData.name)) {
          teacherMetrics.set(teacherData.name, {
            teacher_name: teacherData.name,
            branch_name: teacherData.branch, // Филиал из формы, не из профиля
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0,
            branch_id: null // NULL для рейтинга преподавателей
          })
        }

        const metrics = teacherMetrics.get(teacherData.name)!
        metrics.last_year_base++
        if (teacherData.isStudying) {
          metrics.last_year_returned++
        }
      }

      console.log(
        `PyrusSyncService: форма 2304918 обработана. ` +
        `Задач: ${processedTasks}, валидных: ${validTasks}, исключено: ${excludedTasks}`
      )

      return Array.from(teacherMetrics.values())

    } catch (error) {
      console.error('PyrusSyncService: ошибка синхронизации формы 2304918:', error)
      throw error
    }
  }

  /**
   * Синхронизация формы 792300 (trial)
   */
  async syncForm792300(): Promise<TeacherMetrics[]> {
    console.log('PyrusSyncService: начинаем синхронизацию формы 792300 (trial)')
    
    const teacherMetrics = new Map<string, TeacherMetrics>()
    const branchMetrics = new Map<string, BranchMetrics>()
    
    let processedTasks = 0
    let validTasks = 0
    let excludedTasks = 0

    try {
      // Итерируемся по всем задачам формы
      for await (const task of this.formsClient.iterRegisterTasks(792300, { 
        includeArchived: false,
        batchSize: 200 
      })) {
        processedTasks++
        
        if (processedTasks % 500 === 0) {
          console.log(`PyrusSyncService: обработано ${processedTasks} задач формы 792300`)
        }

        const taskFields = task.fields || []
        const taskId = task.id
        const taskStatus = task.status || ''

        // ФИЛЬТР: Пропускаем закрытые/завершенные задачи согласно Pyrus API
        if (taskStatus.toLowerCase().includes('closed') || 
            taskStatus.toLowerCase().includes('completed') ||
            taskStatus.toLowerCase().includes('finished') ||
            taskStatus.toLowerCase().includes('cancelled')) {
          continue
        }

        // Извлекаем данные преподавателя
        let teacherData: TeacherData
        try {
          teacherData = this.teachersClient.extractTeacherData(
            taskFields,
            taskId,
            this.FORM_792300_FIELDS
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'EXCLUDED_BRANCH') {
            continue // Пропускаем исключенные филиалы
          }
          console.warn(`PyrusSyncService: ошибка извлечения данных из задачи ${taskId}:`, error)
          continue
        }

        // Проверяем валидность данных
        const validation = this.teachersClient.validateTeacherData(teacherData)
        if (!validation.isValid) {
          continue // Пропускаем невалидные данные
        }

        validTasks++

        // ВСЕГДА учитываем в статистике филиала (даже исключенных преподавателей)
        if (!branchMetrics.has(teacherData.branch)) {
          branchMetrics.set(teacherData.branch, {
            branch_name: teacherData.branch,
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0
          })
        }

        const branchStats = branchMetrics.get(teacherData.branch)!
        branchStats.trial_total++
        if (teacherData.isStudying) {
          branchStats.trial_converted++
        }

        // Проверяем исключения для trial - только для статистики преподавателей
        if (this.isTeacherExcluded(teacherData.name, 'trial')) {
          excludedTasks++
          continue // Не добавляем в статистику преподавателей
        }

        // Инициализируем статистику преподавателя
        if (!teacherMetrics.has(teacherData.name)) {
          teacherMetrics.set(teacherData.name, {
            teacher_name: teacherData.name,
            branch_name: teacherData.branch, // Филиал из формы, не из профиля
            last_year_base: 0,
            last_year_returned: 0,
            trial_total: 0,
            trial_converted: 0,
            branch_id: null // NULL для рейтинга преподавателей
          })
        }

        const metrics = teacherMetrics.get(teacherData.name)!
        metrics.trial_total++
        if (teacherData.isStudying) {
          metrics.trial_converted++
        }
      }

      console.log(
        `PyrusSyncService: форма 792300 обработана. ` +
        `Задач: ${processedTasks}, валидных: ${validTasks}, исключено: ${excludedTasks}`
      )

      return Array.from(teacherMetrics.values())

    } catch (error) {
      console.error('PyrusSyncService: ошибка синхронизации формы 792300:', error)
      throw error
    }
  }

  /**
   * Полная синхронизация обеих форм
   */
  async syncAllForms(): Promise<SyncResult> {
    const startTime = new Date()
    const errors: string[] = []
    let teachersProcessed = 0
    let branchesProcessed = 0

    try {
      console.log('PyrusSyncService: начинаем полную синхронизацию')

      // Синхронизируем обе формы параллельно
      const [form2304918Results, form792300Results] = await Promise.allSettled([
        this.syncForm2304918(),
        this.syncForm792300()
      ])

      // Обрабатываем результаты формы 2304918
      let metrics2304918: TeacherMetrics[] = []
      if (form2304918Results.status === 'fulfilled') {
        metrics2304918 = form2304918Results.value
      } else {
        errors.push(`Ошибка синхронизации формы 2304918: ${form2304918Results.reason}`)
      }

      // Обрабатываем результаты формы 792300
      let metrics792300: TeacherMetrics[] = []
      if (form792300Results.status === 'fulfilled') {
        metrics792300 = form792300Results.value
      } else {
        errors.push(`Ошибка синхронизации формы 792300: ${form792300Results.reason}`)
      }

      // Объединяем данные преподавателей
      const combinedMetrics = this.combineTeacherMetrics(metrics2304918, metrics792300)
      teachersProcessed = combinedMetrics.length

      // Группируем данные по филиалам
      const branchMetrics = this.groupDataByBranch(combinedMetrics)
      branchesProcessed = branchMetrics.length

      // Обновляем базу данных
      await this.updateTeacherMetrics(combinedMetrics)
      await this.updateBranchMetrics(branchMetrics)

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      console.log(
        `PyrusSyncService: синхронизация завершена. ` +
        `Преподавателей: ${teachersProcessed}, филиалов: ${branchesProcessed}, ` +
        `время: ${duration}мс`
      )

      return {
        success: errors.length === 0,
        teachersProcessed,
        branchesProcessed,
        errors,
        startTime,
        endTime,
        duration
      }

    } catch (error) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      errors.push(`Критическая ошибка синхронизации: ${errorMessage}`)

      console.error('PyrusSyncService: критическая ошибка синхронизации:', error)

      return {
        success: false,
        teachersProcessed,
        branchesProcessed,
        errors,
        startTime,
        endTime,
        duration
      }
    }
  }

  /**
   * Проверяет, исключен ли преподаватель из указанной формы
   */
  private isTeacherExcluded(teacherName: string, formType: 'oldies' | 'trial'): boolean {
    return isTeacherExcluded(teacherName, formType)
  }

  /**
   * Объединяет данные преподавателей из двух форм
   * ИСПРАВЛЕНО: применяем финальную фильтрацию исключений после объединения
   */
  private combineTeacherMetrics(
    metrics2304918: TeacherMetrics[],
    metrics792300: TeacherMetrics[]
  ): TeacherMetrics[] {
    const combined = new Map<string, TeacherMetrics>()

    // Добавляем данные из формы 2304918
    for (const metric of metrics2304918) {
      combined.set(metric.teacher_name, { ...metric })
    }

    // Дополняем данными из формы 792300
    for (const metric of metrics792300) {
      if (combined.has(metric.teacher_name)) {
        const existing = combined.get(metric.teacher_name)!
        existing.trial_total = metric.trial_total
        existing.trial_converted = metric.trial_converted
      } else {
        combined.set(metric.teacher_name, { ...metric })
      }
    }

    // ФИНАЛЬНАЯ ФИЛЬТРАЦИЯ: исключаем преподавателей из обеих категорий
    const finalResults = Array.from(combined.values()).filter(metric => {
      // Исключаем если преподаватель есть в любом из списков исключений
      const excludedFromOldies = this.isTeacherExcluded(metric.teacher_name, 'oldies')
      const excludedFromTrial = this.isTeacherExcluded(metric.teacher_name, 'trial')
      
      if (excludedFromOldies || excludedFromTrial) {
        console.log(`🚫 Исключен после объединения: ${metric.teacher_name} (oldies: ${excludedFromOldies}, trial: ${excludedFromTrial})`)
        return false
      }
      
      return true
    })

    const excludedCount = combined.size - finalResults.length
    if (excludedCount > 0) {
      console.log(`🚫 Применены финальные исключения: исключено ${excludedCount} преподавателей после объединения`)
    }

    return finalResults
  }

  /**
   * Группирует данные по филиалам ИЗ ФОРМ (не из profiles.branch_id)
   */
  private groupDataByBranch(teacherMetrics: TeacherMetrics[]): BranchMetrics[] {
    const branchMap = new Map<string, BranchMetrics>()

    for (const metric of teacherMetrics) {
      const branchName = metric.branch_name

      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          branch_name: branchName,
          last_year_base: 0,
          last_year_returned: 0,
          trial_total: 0,
          trial_converted: 0
        })
      }

      const branchMetric = branchMap.get(branchName)!
      branchMetric.last_year_base += metric.last_year_base
      branchMetric.last_year_returned += metric.last_year_returned
      branchMetric.trial_total += metric.trial_total
      branchMetric.trial_converted += metric.trial_converted
    }

    return Array.from(branchMap.values())
  }

  /**
   * Обновляет таблицу teacher_metrics
   * Записывает данные в Supabase и пересчитывает рейтинги
   */
  private async updateTeacherMetrics(metrics: TeacherMetrics[]): Promise<void> {
    console.log(`PyrusSyncService: обновление teacher_metrics (${metrics.length} записей)`)
    
    if (metrics.length === 0) {
      console.log('PyrusSyncService: нет данных для обновления')
      return
    }

    try {
      // Сначала нужно найти teacher_id по имени преподавателя
      const teacherNames = metrics.map(m => m.teacher_name)
      console.log(`PyrusSyncService: поиск ID для ${teacherNames.length} преподавателей:`)
      teacherNames.forEach(name => console.log(`  - "${name}"`))
      
      // ТОЧНОЕ сопоставление имен — Pyrus является источником истины
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email')
        .in('full_name', teacherNames)
        .eq('role', 'Teacher')

      if (profilesError) {
        throw new Error(`Ошибка получения профилей: ${profilesError.message}`)
      }

      console.log(`PyrusSyncService: найдено ${profiles?.length || 0} профилей преподавателей`)

      // Создаем маппинг имя -> teacher_id с ТОЧНЫМ совпадением
      const nameToIdMap = new Map<string, string>()
      profiles?.forEach(profile => {
        if (profile.full_name && teacherNames.includes(profile.full_name)) {
          nameToIdMap.set(profile.full_name, profile.user_id)
          console.log(`  ✅ Сопоставлен: "${profile.full_name}" → ${profile.user_id}`)
        }
      })

      // Логируем НЕсопоставленные имена
      const unmatchedNames = teacherNames.filter(name => !nameToIdMap.has(name))
      if (unmatchedNames.length > 0) {
        console.warn(`⚠️  Не найдены в profiles следующие преподаватели из Pyrus:`)
        unmatchedNames.forEach(name => console.warn(`  - "${name}"`))
      }

      console.log(`PyrusSyncService: создано ${nameToIdMap.size} точных маппингов имя->ID`)

      // Подготавливаем данные для upsert
      const upsertData = metrics
        .filter(metric => nameToIdMap.has(metric.teacher_name))
        .map(metric => ({
          teacher_id: nameToIdMap.get(metric.teacher_name)!,
          branch_id: metric.branch_id, // NULL для рейтинга преподавателей
          last_year_base: metric.last_year_base || 0,
          last_year_returned: metric.last_year_returned || 0,
          trial_total: metric.trial_total || 0,
          trial_converted: metric.trial_converted || 0,
          updated_by: 'pyrus-sync-service'
        }))

      if (upsertData.length === 0) {
        console.warn('PyrusSyncService: не найдено преподавателей для обновления в базе')
        return
      }

      console.log(`PyrusSyncService: обновление ${upsertData.length} записей в teacher_metrics`)

      // Записываем в базу данных
      const { error: upsertError } = await supabaseAdmin
        .from('teacher_metrics')
        .upsert(upsertData, { 
          onConflict: 'teacher_id',
          ignoreDuplicates: false 
        })

      if (upsertError) {
        throw new Error(`Ошибка upsert в teacher_metrics: ${upsertError.message}`)
      }

      console.log('✅ PyrusSyncService: данные успешно записаны в teacher_metrics')

      // Пересчитываем рейтинги
      console.log('PyrusSyncService: пересчет рейтингов...')
      const { error: recomputeError } = await supabaseAdmin.rpc('recompute_current_scores')
      
      if (recomputeError) {
        console.error('❌ PyrusSyncService: ошибка пересчета рейтингов:', recomputeError)
        throw new Error(`Ошибка пересчета рейтингов: ${recomputeError.message}`)
      }

      console.log('✅ PyrusSyncService: рейтинги пересчитаны')

      // Логируем несколько примеров для отладки
      for (const metric of upsertData.slice(0, 5)) {
        const originalMetric = metrics.find(m => nameToIdMap.get(m.teacher_name) === metric.teacher_id)
        if (originalMetric) {
          console.log(`  - ${originalMetric.teacher_name}: старички ${metric.last_year_returned}/${metric.last_year_base}, trial ${metric.trial_converted}/${metric.trial_total}`)
        }
      }
      
      if (upsertData.length > 5) {
        console.log(`  ... и еще ${upsertData.length - 5} преподавателей`)
      }

    } catch (error) {
      console.error('❌ PyrusSyncService: ошибка обновления teacher_metrics:', error)
      throw error
    }
  }

  /**
   * Обновляет метрики филиалов
   * Записывает агрегированные данные по филиалам для рейтинга филиалов
   */
  private async updateBranchMetrics(metrics: BranchMetrics[]): Promise<void> {
    console.log(`PyrusSyncService: обновление метрик филиалов (${metrics.length} записей)`)
    
    if (metrics.length === 0) {
      console.log('PyrusSyncService: нет данных филиалов для обновления')
      return
    }

    // Пока просто логируем для отладки - обновление филиалов через teacher_metrics
    for (const metric of metrics) {
      const returnPercentage = metric.last_year_base > 0 
        ? (metric.last_year_returned / metric.last_year_base * 100).toFixed(1)
        : '0.0'
      const conversionPercentage = metric.trial_total > 0 
        ? (metric.trial_converted / metric.trial_total * 100).toFixed(1)
        : '0.0'
        
      console.log(`  - ${metric.branch_name}: возврат ${returnPercentage}%, конверсия ${conversionPercentage}%`)
    }
    
    console.log('✅ PyrusSyncService: метрики филиалов обработаны (агрегация через teacher_metrics)')
  }
}
