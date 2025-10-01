/**
 * НОВЫЙ Сервис синхронизации данных из Pyrus в базу данных портала
 * 
 * Использует новую надежную архитектуру
 * Основана на ТОЧНОЙ КОПИИ логики из final_fixed_report.md
 */

import { PyrusFormsClient } from '../pyrus/forms-client'
import { PyrusTeachersClientV2, TeacherData, FormFieldMapping } from '../pyrus/teachers-client-v2'
import { pyrusDebugLogger } from '../pyrus/core/debug-logger'
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

/**
 * Статистика по преподавателю (как в Python)
 */
class TeacherStats {
  name: string
  // Форма 2304918 (возврат студентов)
  form_2304918_total = 0
  form_2304918_studying = 0
  form_2304918_data: any[] = []
  
  // Форма 792300 (конверсия после БПЗ)
  form_792300_total = 0
  form_792300_studying = 0
  form_792300_data: any[] = []

  constructor(name: string) {
    this.name = name
  }

  get return_percentage(): number {
    if (this.form_2304918_total === 0) return 0.0
    return (this.form_2304918_studying / this.form_2304918_total) * 100
  }

  get conversion_percentage(): number {
    if (this.form_792300_total === 0) return 0.0
    return (this.form_792300_studying / this.form_792300_total) * 100
  }

  get total_percentage(): number {
    return this.return_percentage + this.conversion_percentage
  }
}

/**
 * Статистика по филиалу (как в Python)
 */
class BranchStats {
  name: string
  // Форма 2304918 (старички)
  form_2304918_total = 0
  form_2304918_studying = 0
  
  // Форма 792300 (новый клиент)
  form_792300_total = 0
  form_792300_studying = 0

  constructor(name: string) {
    this.name = name
  }

  get return_percentage(): number {
    if (this.form_2304918_total === 0) return 0.0
    return (this.form_2304918_studying / this.form_2304918_total) * 100
  }

  get conversion_percentage(): number {
    if (this.form_792300_total === 0) return 0.0
    return (this.form_792300_studying / this.form_792300_total) * 100
  }

  get total_percentage(): number {
    return this.return_percentage + this.conversion_percentage
  }
}

export class PyrusSyncServiceV2 {
  private formsClient: PyrusFormsClient
  private teachersClient: PyrusTeachersClientV2
  
  private teachersStats = new Map<string, TeacherStats>()
  private branchesStats = new Map<string, BranchStats>()

  // Маппинг полей для форм (ТОЧНО как в Python)
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

  // Отладочная цель (как в Python)
  private readonly DEBUG_TARGET = "Анастасия Алексеевна Нечунаева"

  constructor(
    formsClient: PyrusFormsClient,
    teachersClient: PyrusTeachersClientV2
  ) {
    this.formsClient = formsClient
    this.teachersClient = teachersClient
    
    // Настраиваем отладку
    this.setupDebugLogging()
  }

  /**
   * Настройка системы отладки (как в Python)
   */
  private setupDebugLogging(): void {
    pyrusDebugLogger.reset()
    pyrusDebugLogger.addTarget(this.DEBUG_TARGET, {
      "2304918_found": 0,
      "2304918_valid_pe": 0,
      "2304918_excluded": 0,
      "2304918_processed": 0,
      "792300_found": 0,
      "792300_valid_pe": 0,
      "792300_excluded": 0,
      "792300_processed": 0
    })
  }

  /**
   * ТОЧНАЯ КОПИЯ логики анализа формы 2304918 из Python
   */
  async analyzeForm2304918(): Promise<void> {
    console.log("Анализ формы 2304918 (старички)...")
    
    const formId = 2304918
    let excludedCount = 0
    let taskCount = 0
    let filteredCount = 0
    let invalidPECount = 0
    let extractionErrorsCount = 0
    
    // КРИТИЧЕСКИ ВАЖНО: создаем отдельный счетчик для каждого преподавателя
    const teacherCounters = new Map<string, number>()
    const uniqueTeachersFound = new Set<string>()

    try {
      // Итерируемся по всем задачам формы (БЕЗ фильтрации по статусу задачи!)
      for await (const task of this.formsClient.iterRegisterTasks(formId, { 
        includeArchived: false,
        batchSize: 200 
      })) {
        taskCount++
        
        if (taskCount % 100 === 0) {
          console.log(`Обработано ${taskCount} задач формы 2304918...`)
        }

        const taskFields = task.fields || []
        const taskId = task.id

        // Извлекаем данные преподавателя
        let teacherData: TeacherData
        try {
          teacherData = this.teachersClient.extractTeacherData(
            taskFields,
            taskId,
            this.FORM_2304918_FIELDS,
            this.DEBUG_TARGET
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'EXCLUDED_BRANCH') {
            continue // Пропускаем исключенные филиалы
          }
          extractionErrorsCount++
          console.warn(`Ошибка извлечения данных из задачи ${taskId}:`, error)
          continue
        }

        // Отслеживаем всех уникальных преподавателей
        uniqueTeachersFound.add(teacherData.name)

        // ОТЛАДКА: считаем ВСЕ найденные задачи для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "2304918_found")
        }

        // Проверяем валидность статуса PE - фильтруем только PE Start, PE Future, PE 5
        if (!teacherData.isValidPEStatus) {
          invalidPECount++
          continue
        }

        filteredCount++

        // ОТЛАДКА: считаем задачи с валидным PE для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "2304918_valid_pe")
        }

        // Учитываем в статистике филиала ТОЛЬКО если филиал НЕ исключен из соревнования
        if (!this.teachersClient.isBranchExcludedFromCompetition(teacherData.branch)) {
          // Инициализируем статистику филиала если нужно
          if (!this.branchesStats.has(teacherData.branch)) {
            this.branchesStats.set(teacherData.branch, new BranchStats(teacherData.branch))
          }

          const branchStats = this.branchesStats.get(teacherData.branch)!
          branchStats.form_2304918_total++
          if (teacherData.isStudying) {
            branchStats.form_2304918_studying++
          }
        }

        // Проверяем исключения для старичков (форма 2304918) - только для статистики преподавателей
        if (this.teachersClient.isTeacherExcluded(teacherData.name, 'oldies', this.DEBUG_TARGET)) {
          excludedCount++
          
          // ОТЛАДКА: считаем исключенные задачи для целевого преподавателя
          if (teacherData.name === this.DEBUG_TARGET) {
            pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "2304918_excluded")
          }
          
          continue // Не добавляем в статистику преподавателей
        }

        // КРИТИЧЕСКИ ВАЖНО: инициализируем статистику преподавателя только ОДИН раз
        if (!this.teachersStats.has(teacherData.name)) {
          this.teachersStats.set(teacherData.name, new TeacherStats(teacherData.name))
          
          // ОТЛАДКА: логируем создание нового преподавателя
          if (teacherData.name === this.DEBUG_TARGET) {
            pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
              `🆕 СОЗДАН новый преподаватель: ${teacherData.name}`)
          }
        }

        const teacherStats = this.teachersStats.get(teacherData.name)!

        // КРИТИЧЕСКИ ВАЖНО: увеличиваем счетчики АТОМАРНО
        teacherStats.form_2304918_total++
        if (teacherData.isStudying) {
          teacherStats.form_2304918_studying++
        }

        // Увеличиваем отладочный счетчик
        teacherCounters.set(teacherData.name, (teacherCounters.get(teacherData.name) || 0) + 1)

        // ОТЛАДКА: считаем обработанные задачи для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "2304918_processed")
          pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
            `🔄 ОБРАБОТАНО ${pyrusDebugLogger.getTargetStats(this.DEBUG_TARGET)?.["2304918_processed"]}: ${teacherData.name} → итого ${teacherStats.form_2304918_total}, учится ${teacherStats.form_2304918_studying}`)
        }

        // Сохраняем данные для детализации
        teacherStats.form_2304918_data.push({
          task_id: taskId,
          teacher: teacherData.name,
          branch: teacherData.branch,
          is_studying: teacherData.isStudying
        })
      }

      console.log('\n📊 === ДЕТАЛЬНАЯ СТАТИСТИКА ФОРМЫ 2304918 ===')
      console.log(`  Всего задач обработано: ${taskCount}`)
      console.log(`  Уникальных преподавателей найдено: ${uniqueTeachersFound.size}`)
      console.log(`  Задач с невалидным PE статусом: ${invalidPECount}`)
      console.log(`  Ошибок извлечения данных: ${extractionErrorsCount}`)
      console.log(`  Задач с валидным PE статусом: ${filteredCount}`)
      console.log(`  Преподавателей исключено: ${excludedCount}`)
      console.log(`  Преподавателей добавлено в рейтинг: ${this.teachersStats.size}`)
      console.log('==============================================\n')

      // ОТЛАДКА: проверяем финальное состояние для целевого преподавателя
      if (this.teachersStats.has(this.DEBUG_TARGET)) {
        const finalStats = this.teachersStats.get(this.DEBUG_TARGET)!
        pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
          `🎯 ФИНАЛЬНОЕ СОСТОЯНИЕ ${this.DEBUG_TARGET}: ${finalStats.form_2304918_total} всего, ${finalStats.form_2304918_studying} учится`)
      } else {
        pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
          `❌ ${this.DEBUG_TARGET} НЕ НАЙДЕН в финальной статистике!`)
      }

    } catch (error) {
      console.error('Ошибка анализа формы 2304918:', error)
      throw error
    }
  }

  /**
   * ТОЧНАЯ КОПИЯ логики анализа формы 792300 из Python
   */
  async analyzeForm792300(): Promise<void> {
    console.log("Анализ формы 792300 (новый клиент)...")
    
    const formId = 792300
    let excludedCount = 0
    let taskCount = 0
    let filteredCount = 0
    let invalidPECount = 0
    let extractionErrorsCount = 0
    
    // КРИТИЧЕСКИ ВАЖНО: создаем отдельный счетчик для каждого преподавателя
    const teacherCounters = new Map<string, number>()
    const uniqueTeachersFound = new Set<string>()

    try {
      // Итерируемся по всем задачам формы (БЕЗ фильтрации по статусу задачи!)
      for await (const task of this.formsClient.iterRegisterTasks(formId, { 
        includeArchived: false,
        batchSize: 200 
      })) {
        taskCount++
        
        if (taskCount % 100 === 0) {
          console.log(`Обработано ${taskCount} задач формы 792300...`)
        }

        const taskFields = task.fields || []
        const taskId = task.id

        // Извлекаем данные преподавателя
        let teacherData: TeacherData
        try {
          teacherData = this.teachersClient.extractTeacherData(
            taskFields,
            taskId,
            this.FORM_792300_FIELDS,
            this.DEBUG_TARGET
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'EXCLUDED_BRANCH') {
            continue // Пропускаем исключенные филиалы
          }
          extractionErrorsCount++
          console.warn(`Ошибка извлечения данных из задачи ${taskId}:`, error)
          continue
        }

        // Отслеживаем всех уникальных преподавателей
        uniqueTeachersFound.add(teacherData.name)

        // ОТЛАДКА: считаем ВСЕ найденные задачи для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "792300_found")
        }

        // Проверяем валидность статуса PE - фильтруем только PE Start, PE Future, PE 5
        if (!teacherData.isValidPEStatus) {
          invalidPECount++
          continue
        }

        filteredCount++

        // ОТЛАДКА: считаем задачи с валидным PE для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "792300_valid_pe")
        }

        // Учитываем в статистике филиала ТОЛЬКО если филиал НЕ исключен из соревнования
        if (!this.teachersClient.isBranchExcludedFromCompetition(teacherData.branch)) {
          // Инициализируем статистику филиала если нужно
          if (!this.branchesStats.has(teacherData.branch)) {
            this.branchesStats.set(teacherData.branch, new BranchStats(teacherData.branch))
          }

          const branchStats = this.branchesStats.get(teacherData.branch)!
          branchStats.form_792300_total++
          if (teacherData.isStudying) {
            branchStats.form_792300_studying++
          }
        }

        // Проверяем исключения для БПЗ (форма 792300) - только для статистики преподавателей
        if (this.teachersClient.isTeacherExcluded(teacherData.name, 'trial', this.DEBUG_TARGET)) {
          excludedCount++
          
          // ОТЛАДКА: считаем исключенные задачи для целевого преподавателя
          if (teacherData.name === this.DEBUG_TARGET) {
            pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "792300_excluded")
          }
          
          continue // Не добавляем в статистику преподавателей
        }

        // КРИТИЧЕСКИ ВАЖНО: инициализируем статистику преподавателя только ОДИН раз
        if (!this.teachersStats.has(teacherData.name)) {
          this.teachersStats.set(teacherData.name, new TeacherStats(teacherData.name))
          
          // ОТЛАДКА: логируем создание нового преподавателя
          if (teacherData.name === this.DEBUG_TARGET) {
            pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
              `🆕 СОЗДАН новый преподаватель в 792300: ${teacherData.name}`)
          }
        }

        const teacherStats = this.teachersStats.get(teacherData.name)!

        // КРИТИЧЕСКИ ВАЖНО: увеличиваем счетчики АТОМАРНО
        teacherStats.form_792300_total++
        if (teacherData.isStudying) {
          teacherStats.form_792300_studying++
        }

        // Увеличиваем отладочный счетчик
        teacherCounters.set(teacherData.name, (teacherCounters.get(teacherData.name) || 0) + 1)

        // ОТЛАДКА: считаем обработанные задачи для целевого преподавателя
        if (teacherData.name === this.DEBUG_TARGET) {
          pyrusDebugLogger.incrementTarget(this.DEBUG_TARGET, "792300_processed")
          pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
            `🔄 ОБРАБОТАНО ${pyrusDebugLogger.getTargetStats(this.DEBUG_TARGET)?.["792300_processed"]}: ${teacherData.name} → итого 792300: ${teacherStats.form_792300_total}, учится ${teacherStats.form_792300_studying}`)
        }

        // Сохраняем данные для детализации
        teacherStats.form_792300_data.push({
          task_id: taskId,
          teacher: teacherData.name,
          branch: teacherData.branch,
          is_studying: teacherData.isStudying
        })
      }

      console.log('\n📊 === ДЕТАЛЬНАЯ СТАТИСТИКА ФОРМЫ 792300 ===')
      console.log(`  Всего задач обработано: ${taskCount}`)
      console.log(`  Уникальных преподавателей найдено: ${uniqueTeachersFound.size}`)
      console.log(`  Задач с невалидным PE статусом: ${invalidPECount}`)
      console.log(`  Ошибок извлечения данных: ${extractionErrorsCount}`)
      console.log(`  Задач с валидным PE статусом: ${filteredCount}`)
      console.log(`  Преподавателей исключено: ${excludedCount}`)
      console.log(`  Преподавателей добавлено в рейтинг: ${this.teachersStats.size}`)
      console.log('==============================================\n')

      // ОТЛАДКА: проверяем финальное состояние для целевого преподавателя
      if (this.teachersStats.has(this.DEBUG_TARGET)) {
        const finalStats = this.teachersStats.get(this.DEBUG_TARGET)!
        pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
          `🎯 ФИНАЛЬНОЕ СОСТОЯНИЕ ${this.DEBUG_TARGET}: 2304918=${finalStats.form_2304918_total}, 792300=${finalStats.form_792300_total}`)
      } else {
        pyrusDebugLogger.logTargetDetail(this.DEBUG_TARGET, 
          `❌ ${this.DEBUG_TARGET} НЕ НАЙДЕН в финальной статистике!`)
      }

    } catch (error) {
      console.error('Ошибка анализа формы 792300:', error)
      throw error
    }
  }

  /**
   * Полная синхронизация обеих форм (как в Python run_analysis)
   */
  async syncAllForms(): Promise<SyncResult> {
    const startTime = new Date()
    const errors: string[] = []
    let teachersProcessed = 0
    let branchesProcessed = 0

    try {
      console.log('Начинаем создание отчета из Pyrus...')
      console.log(`Время начала: ${startTime.toISOString()}`)

      // Анализируем обе формы ПОСЛЕДОВАТЕЛЬНО (как в Python)
      await this.analyzeForm2304918()
      await this.analyzeForm792300()

      // Выводим отладочную сводку
      pyrusDebugLogger.printFinalSummary()

      // Выводим краткую статистику
      console.log('\n🎯 === ИТОГОВАЯ СТАТИСТИКА СИНХРОНИЗАЦИИ ===')
      teachersProcessed = this.teachersStats.size
      branchesProcessed = this.branchesStats.size
      console.log(`Всего уникальных преподавателей в рейтинге: ${teachersProcessed}`)
      console.log(`Всего филиалов: ${branchesProcessed}`)
      
      // Показываем список всех преподавателей для отладки
      if (teachersProcessed <= 100) { // Если не слишком много
        console.log('\n📋 Список преподавателей в рейтинге:')
        let counter = 1
        for (const [name, stats] of this.teachersStats) {
          console.log(`  ${counter}. ${name} (2304918: ${stats.form_2304918_total}, 792300: ${stats.form_792300_total})`)
          counter++
        }
      }
      console.log('==============================================\n')

      // Преобразуем в формат для базы данных
      const teacherMetrics = this.convertToTeacherMetrics()
      const branchMetrics = this.convertToBranchMetrics()
      
      console.log(`📝 Преобразовано ${teacherMetrics.length} метрик для записи в БД`)

      // Обновляем базу данных
      await this.updateTeacherMetrics(teacherMetrics)

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      console.log(`Анализ завершен: ${endTime.toISOString()}`)

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

      console.error('Критическая ошибка синхронизации:', error)

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
   * Преобразование статистики преподавателей в формат для базы данных
   */
  private convertToTeacherMetrics(): TeacherMetrics[] {
    const metrics: TeacherMetrics[] = []

    for (const stats of this.teachersStats.values()) {
      // Определяем филиал из данных формы (приоритет у 2304918, затем 792300)
      let branchName = 'Неизвестный филиал'
      
      if (stats.form_2304918_data.length > 0) {
        branchName = stats.form_2304918_data[0].branch
      } else if (stats.form_792300_data.length > 0) {
        branchName = stats.form_792300_data[0].branch
      }

      metrics.push({
        teacher_name: stats.name,
        branch_name: branchName,
        last_year_base: stats.form_2304918_total,
        last_year_returned: stats.form_2304918_studying,
        trial_total: stats.form_792300_total,
        trial_converted: stats.form_792300_studying,
        branch_id: null // NULL для рейтинга преподавателей
      })
    }

    return metrics
  }

  /**
   * Преобразование статистики филиалов в формат для базы данных
   */
  private convertToBranchMetrics(): BranchMetrics[] {
    const metrics: BranchMetrics[] = []

    for (const stats of this.branchesStats.values()) {
      metrics.push({
        branch_name: stats.name,
        last_year_base: stats.form_2304918_total,
        last_year_returned: stats.form_2304918_studying,
        trial_total: stats.form_792300_total,
        trial_converted: stats.form_792300_studying
      })
    }

    return metrics
  }

  /**
   * Утилита для разбивки массива на чанки (батчи)
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Обновление таблицы teacher_metrics (как в оригинальном сервисе)
   * С батчингом запросов для надежности
   */
  private async updateTeacherMetrics(metrics: TeacherMetrics[]): Promise<void> {
    console.log(`Обновление teacher_metrics (${metrics.length} записей)`)
    
    if (metrics.length === 0) {
      console.log('Нет данных для обновления')
      return
    }

    try {
      // Сначала нужно найти teacher_id по имени преподавателя
      const teacherNames = metrics.map(m => m.teacher_name)
      console.log(`Поиск ID для ${teacherNames.length} преподавателей`)
      
      // БАТЧИНГ: разбиваем запрос на чанки по 50 имен для надежности
      const BATCH_SIZE = 50
      const nameBatches = this.chunkArray(teacherNames, BATCH_SIZE)
      console.log(`Запросы разбиты на ${nameBatches.length} батчей по ${BATCH_SIZE} имен`)
      
      // Собираем результаты всех батчей
      const allProfiles: Array<{ user_id: string; full_name: string; email: string }> = []
      const batchErrors: string[] = []

      // Выполняем запросы батчами
      for (let i = 0; i < nameBatches.length; i++) {
        const batch = nameBatches[i]
        console.log(`  Обработка батча ${i + 1}/${nameBatches.length} (${batch.length} имен)...`)
        
        try {
          // Ищем по ФИО БЕЗ фильтра по role - Pyrus является источником истины
          // Если человек есть в формах Pyrus → он преподаватель
          const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name, email')
            .in('full_name', batch)

          if (profilesError) {
            const errorMsg = `Ошибка в батче ${i + 1}: ${profilesError.message}`
            batchErrors.push(errorMsg)
            console.warn(`  ⚠️  ${errorMsg}`)
            continue // Продолжаем обработку следующих батчей
          }

          if (profiles && profiles.length > 0) {
            allProfiles.push(...profiles)
            console.log(`  ✅ Батч ${i + 1}: найдено ${profiles.length} профилей`)
          } else {
            console.log(`  ℹ️  Батч ${i + 1}: профили не найдены`)
          }
        } catch (batchError) {
          const errorMsg = `Исключение в батче ${i + 1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
          batchErrors.push(errorMsg)
          console.error(`  ❌ ${errorMsg}`)
          continue // Продолжаем обработку следующих батчей
        }
      }

      // Проверяем результаты батчинга
      if (batchErrors.length > 0) {
        console.warn(`⚠️  Возникли ошибки в ${batchErrors.length} батчах:`)
        batchErrors.forEach(err => console.warn(`  - ${err}`))
      }

      if (allProfiles.length === 0) {
        throw new Error(`Не удалось получить ни одного профиля (обработано ${nameBatches.length} батчей, ошибок: ${batchErrors.length})`)
      }

      console.log(`Найдено ${allProfiles.length} профилей преподавателей из ${teacherNames.length} запрошенных`)

      // Создаем маппинг имя -> teacher_id с ТОЧНЫМ совпадением
      const nameToIdMap = new Map<string, string>()
      allProfiles.forEach(profile => {
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

      console.log(`Создано ${nameToIdMap.size} точных маппингов имя->ID`)

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
          updated_by: 'pyrus-sync-service-v2'
        }))

      if (upsertData.length === 0) {
        console.warn('Не найдено преподавателей для обновления в базе')
        return
      }

      console.log(`Обновление ${upsertData.length} записей в teacher_metrics`)

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

      console.log('✅ Данные успешно записаны в teacher_metrics')

      // Пересчитываем рейтинги
      console.log('Пересчет рейтингов...')
      const { error: recomputeError } = await supabaseAdmin.rpc('recompute_current_scores')
      
      if (recomputeError) {
        console.error('❌ Ошибка пересчета рейтингов:', recomputeError)
        throw new Error(`Ошибка пересчета рейтингов: ${recomputeError.message}`)
      }

      console.log('✅ Рейтинги пересчитаны')

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
      console.error('❌ Ошибка обновления teacher_metrics:', error)
      throw error
    }
  }
}
