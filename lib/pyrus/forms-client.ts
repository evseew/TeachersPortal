/**
 * Клиент для работы с формами Pyrus API v4
 * 
 * Использует курсорную пагинацию по официальной документации Pyrus API.
 * @see PYRUS_API_INTEGRATION_GUIDE.md
 */

import { PyrusBaseClient, PyrusRequestOptions } from './base-client'
import { PyrusPaginationHandler, PaginationOptions } from './core/pagination-handler'
import { PyrusFieldExtractor, pyrusFieldExtractor } from './core/field-extractor'

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

// Примечание: PyrusTasksResponse теперь определен в pagination-handler.ts
// и использует курсорную пагинацию (next_cursor вместо next_task_id)

export interface FormsIteratorOptions {
  includeArchived?: boolean
  maxTasks?: number
  batchSize?: number
  requestOptions?: PyrusRequestOptions
}

export class PyrusFormsClient extends PyrusBaseClient {
  private paginationHandler: PyrusPaginationHandler
  private fieldExtractor: PyrusFieldExtractor

  constructor() {
    super()
    this.paginationHandler = new PyrusPaginationHandler(this)
    this.fieldExtractor = pyrusFieldExtractor
  }
  
  /**
   * Итератор по задачам формы с курсорной пагинацией
   * Использует официальную документацию Pyrus API v4
   * @see PYRUS_API_INTEGRATION_GUIDE.md
   */
  async *iterRegisterTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    // Преобразуем опции к формату пагинатора
    const paginationOptions: PaginationOptions = {
      includeArchived: options.includeArchived,
      maxTasks: options.maxTasks,
      batchSize: options.batchSize,
      logProgress: true
    }

    // Используем курсорный пагинатор
    for await (const task of this.paginationHandler.iterateAllTasks(formId, paginationOptions)) {
      yield task
    }
  }

  /**
   * НОВЫЙ: Получение значения поля через надежный экстрактор
   * Использует проверенную логику из Python
   */
  getFieldValue(fieldList: PyrusField[], fieldId: number): any {
    return this.fieldExtractor.getFieldValue(fieldList, fieldId)
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
   * НОВЫЙ: Получение статистики через надежный пагинатор
   */
  async getFormStats(formId: number): Promise<{
    totalTasks: number
    archivedTasks: number
    activeTasks: number
  } | null> {
    return await this.paginationHandler.getFormStats(formId)
  }

  /**
   * НОВЫЙ: Проверка существования формы через пагинатор
   */
  async formExists(formId: number): Promise<boolean> {
    return await this.paginationHandler.formExists(formId)
  }
}
