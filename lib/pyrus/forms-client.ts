/**
 * Клиент для работы с формами Pyrus
 * 
 * Основные возможности:
 * - Итерация по задачам форм с пагинацией
 * - Извлечение значений полей из задач
 * - Фильтрация по статусам и архивным записям
 */

import { PyrusBaseClient, PyrusRequestOptions } from './base-client'

export interface PyrusTask {
  id: number
  subject: string
  status: string
  create_date: string
  due_date?: string
  fields?: PyrusField[]
  [key: string]: any
}

export interface PyrusField {
  id: number
  type: string
  value?: any
  [key: string]: any
}

interface PyrusTasksResponse {
  tasks: PyrusTask[]
  has_more: boolean
  next_task_id?: number
}

export interface FormsIteratorOptions {
  includeArchived?: boolean
  maxTasks?: number
  batchSize?: number
  requestOptions?: PyrusRequestOptions
}

export class PyrusFormsClient extends PyrusBaseClient {
  
  /**
   * Итератор по задачам формы с автоматической пагинацией
   * Основан на логике из reference.md
   */
  async *iterRegisterTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    const { 
      includeArchived = false, 
      maxTasks = Infinity, 
      batchSize = 100,
      requestOptions = {} 
    } = options

    let processedTasks = 0
    let nextTaskId: number | undefined = undefined
    let hasMore = true

    console.log(`PyrusFormsClient: начинаем итерацию по форме ${formId}`)

    while (hasMore && processedTasks < maxTasks) {
      try {
        // Строим URL для запроса
        const params = new URLSearchParams({
          item_count: Math.min(batchSize, maxTasks - processedTasks).toString(),
          include_archived: includeArchived ? 'y' : 'n'
          // Убираем task_status - этот параметр может быть неправильным
          // Фильтрацию по статусу делаем на уровне обработки данных
        })

        if (nextTaskId) {
          params.append('max_task_id', nextTaskId.toString())
        }

        const endpoint = `forms/${formId}/register?${params.toString()}`
        
        // Логируем параметры запроса
        console.log(`PyrusFormsClient: запрос к ${endpoint}`)
        
        // Выполняем запрос
        const response = await this.get<PyrusTasksResponse>(endpoint, {
          timeout: 60000, // Увеличиваем timeout для больших форм
          ...requestOptions
        })

        if (!response) {
          console.error(`PyrusFormsClient: не удалось получить данные для формы ${formId}`)
          break
        }

        const { tasks = [], has_more = false, next_task_id } = response

        // Детальное логирование ответа API
        console.log(`PyrusFormsClient: получено ${tasks.length} задач, has_more: ${has_more}, next_task_id: ${next_task_id}`)

        if (tasks.length === 0) {
          console.log(`PyrusFormsClient: получен пустой ответ для формы ${formId}`)
          break
        }

        // Отдаем задачи по одной
        for (const task of tasks) {
          if (processedTasks >= maxTasks) {
            break
          }

          yield task
          processedTasks++
        }

        // Обновляем параметры для следующей итерации
        // ИСПРАВЛЕНИЕ: Останавливаемся если нет next_task_id (бесконечный цикл)
        // И если получили меньше записей чем запрашивали
        hasMore = (next_task_id !== undefined && next_task_id !== null) && tasks.length === batchSize
        nextTaskId = next_task_id
        
        console.log(`PyrusFormsClient: hasMore установлен в ${hasMore} (tasks.length=${tasks.length}, batchSize=${batchSize}, next_task_id=${next_task_id})`)
        
        // ЗАЩИТА от бесконечного цикла: если нет next_task_id, останавливаемся
        if (!next_task_id && tasks.length === batchSize) {
          console.warn(`PyrusFormsClient: ВНИМАНИЕ! API не предоставляет next_task_id, возможен бесконечный цикл. Останавливаемся.`)
          hasMore = false
        }

        // Логирование прогресса
        if (processedTasks % 500 === 0 || !hasMore) {
          console.log(`PyrusFormsClient: обработано ${processedTasks} задач формы ${formId}`)
        }

        // Небольшая задержка между запросами для снижения нагрузки на API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`PyrusFormsClient: ошибка при получении задач формы ${formId}:`, error)
        
        // Пытаемся продолжить с задержкой
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
    }

    console.log(`PyrusFormsClient: итерация завершена. Всего обработано ${processedTasks} задач формы ${formId}`)
  }

  /**
   * Получение значения поля по ID с рекурсивным поиском во вложенных секциях
   * ИСПРАВЛЕНО: правильная обработка структуры данных Pyrus
   */
  getFieldValue(fieldList: PyrusField[], fieldId: number): any {
    if (!Array.isArray(fieldList)) {
      return null
    }

    for (const field of fieldList) {
      // Прямое совпадение по ID
      if (field.id === fieldId) {
        return field.value
      }

      // Рекурсивный поиск во вложенных структурах
      const value = field.value
      if (value && typeof value === 'object') {
        // Поиск в поле fields (основной способ для секций)
        if (Array.isArray(value.fields)) {
          const nestedValue = this.getFieldValue(value.fields, fieldId)
          if (nestedValue !== null && nestedValue !== undefined) {
            return nestedValue
          }
        }

        // Поиск в массиве items (для таблиц и списков)
        if (Array.isArray(value.items)) {
          for (const item of value.items) {
            if (Array.isArray(item.fields)) {
              const nestedValue = this.getFieldValue(item.fields, fieldId)
              if (nestedValue !== null && nestedValue !== undefined) {
                return nestedValue
              }
            }
          }
        }
      }

      // Поиск в массиве fields на уровне поля (альтернативная структура)
      if (Array.isArray(field.fields)) {
        const nestedValue = this.getFieldValue(field.fields, fieldId)
        if (nestedValue !== null && nestedValue !== undefined) {
          return nestedValue
        }
      }
    }

    return null
  }

  /**
   * Получение всех задач формы (для небольших форм)
   */
  async getAllTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): Promise<PyrusTask[]> {
    const tasks: PyrusTask[] = []
    
    try {
      for await (const task of this.iterRegisterTasks(formId, options)) {
        tasks.push(task)
      }
    } catch (error) {
      console.error(`PyrusFormsClient: ошибка при получении всех задач формы ${formId}:`, error)
    }

    return tasks
  }

  /**
   * Получение статистики по форме
   */
  async getFormStats(formId: number): Promise<{
    totalTasks: number
    archivedTasks: number
    activeTasks: number
  } | null> {
    try {
      console.log(`PyrusFormsClient: получение статистики для формы ${formId}`)
      
      let totalTasks = 0
      let archivedTasks = 0

      // Считаем все задачи включая архивные
      for await (const task of this.iterRegisterTasks(formId, { 
        includeArchived: true,
        batchSize: 200 
      })) {
        totalTasks++
        
        // Проверяем статус задачи для определения архивных
        if (task.status && task.status.toLowerCase().includes('archive')) {
          archivedTasks++
        }
      }

      const activeTasks = totalTasks - archivedTasks

      console.log(`PyrusFormsClient: статистика формы ${formId} - всего: ${totalTasks}, активных: ${activeTasks}, архивных: ${archivedTasks}`)

      return {
        totalTasks,
        archivedTasks,
        activeTasks
      }

    } catch (error) {
      console.error(`PyrusFormsClient: ошибка получения статистики формы ${formId}:`, error)
      return null
    }
  }

  /**
   * Проверка существования формы
   */
  async formExists(formId: number): Promise<boolean> {
    try {
      const response = await this.get(`forms/${formId}`)
      return response !== null
    } catch (error) {
      console.error(`PyrusFormsClient: ошибка проверки существования формы ${formId}:`, error)
      return false
    }
  }
}
