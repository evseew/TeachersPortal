/**
 * Клиент для работы с формами Pyrus
 * 
 * ОБНОВЛЕНО: Использует новую надежную архитектуру с правильной пагинацией
 * Основана на проверенной логике из final_fixed_report.md
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
  private paginationHandler: PyrusPaginationHandler
  private fieldExtractor: PyrusFieldExtractor

  constructor() {
    super()
    this.paginationHandler = new PyrusPaginationHandler(this)
    this.fieldExtractor = pyrusFieldExtractor
  }
  
  /**
   * НОВЫЙ: Итератор по задачам формы с правильной пагинацией
   * Использует проверенную логику из Python
   */
  async *iterRegisterTasks(
    formId: number, 
    options: FormsIteratorOptions = {}
  ): AsyncGenerator<PyrusTask, void, unknown> {
    // Преобразуем опции к новому формату
    const paginationOptions: PaginationOptions = {
      includeArchived: options.includeArchived,
      maxTasks: options.maxTasks,
      batchSize: options.batchSize,
      logProgress: true
    }

    // Используем новый надежный пагинатор
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
