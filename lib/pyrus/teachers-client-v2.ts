/**
 * НОВЫЙ Клиент для работы с данными преподавателей из форм Pyrus
 * 
 * Использует новую надежную архитектуру
 * Основана на проверенной логике из final_fixed_report.md
 */

import { PyrusBaseClient } from './base-client'
import { PyrusField } from './forms-client'
import { PyrusFieldExtractor, pyrusFieldExtractor } from './core/field-extractor'
import { pyrusDebugLogger } from './core/debug-logger'
import { isTeacherExcluded as checkTeacherExcluded } from '../constants/teacher-exclusions'

export interface TeacherData {
  name: string
  branch: string
  isStudying: boolean
  isValidPEStatus: boolean
  taskId: number
}

export interface BranchData {
  name: string
  normalizedName: string
  isExcluded: boolean
}

export interface FormFieldMapping {
  teacherFieldId: number
  branchFieldId: number
  studyingFieldId: number
  statusFieldId: number
}

export class PyrusTeachersClientV2 extends PyrusBaseClient {
  private fieldExtractor: PyrusFieldExtractor

  constructor() {
    super()
    this.fieldExtractor = pyrusFieldExtractor
  }

  /**
   * НОВЫЙ: Извлечение ФИО преподавателя через надежный экстрактор
   * Использует проверенную логику из Python
   */
  extractTeacherName(taskFields: PyrusField[], fieldId: number): string {
    return this.fieldExtractor.extractTeacherName(taskFields, fieldId)
  }

  /**
   * НОВЫЙ: Извлечение названия филиала через надежный экстрактор
   * Использует проверенную логику из Python
   */
  extractBranchName(taskFields: PyrusField[], fieldId: number): string {
    return this.fieldExtractor.extractBranchName(taskFields, fieldId)
  }

  /**
   * НОВЫЙ: Проверка отметки "учится" через надежный экстрактор
   * Использует проверенную логику из Python
   */
  isStudying(taskFields: PyrusField[], fieldId: number): boolean {
    return this.fieldExtractor.isStudying(taskFields, fieldId)
  }

  /**
   * НОВЫЙ: Проверка валидности статуса PE через надежный экстрактор
   * Использует проверенную логику из Python
   */
  isValidPEStatus(taskFields: PyrusField[], fieldId: number): boolean {
    return this.fieldExtractor.isValidPEStatus(taskFields, fieldId)
  }

  /**
   * Проверка исключения филиала из соревнования
   */
  isBranchExcludedFromCompetition(branchName: string): boolean {
    return this.fieldExtractor.isBranchExcludedFromCompetition(branchName)
  }

  /**
   * ОБНОВЛЕНО: Извлечение полных данных преподавателя из задачи
   * С детальным логированием для отладки
   */
  extractTeacherData(
    taskFields: PyrusField[], 
    taskId: number,
    fieldMapping: FormFieldMapping,
    debugTargetName?: string
  ): TeacherData {
    const { teacherFieldId, branchFieldId, studyingFieldId, statusFieldId } = fieldMapping

    // Извлекаем данные
    const name = this.extractTeacherName(taskFields, teacherFieldId)
    const branch = this.extractBranchName(taskFields, branchFieldId)
    const isStudying = this.isStudying(taskFields, studyingFieldId)
    const isValidPEStatus = this.isValidPEStatus(taskFields, statusFieldId)

    // Логирование для отладочной цели
    if (debugTargetName && name === debugTargetName) {
      pyrusDebugLogger.logTargetDetail(debugTargetName, 
        `Извлечены данные из задачи ${taskId}`, {
          name,
          branch,
          isStudying,
          isValidPEStatus
        })
    }

    return {
      name,
      branch,
      isStudying,
      isValidPEStatus,
      taskId
    }
  }

  /**
   * НОВАЯ: Валидация данных преподавателя с детальной диагностикой
   */
  validateTeacherData(data: TeacherData, debugTargetName?: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.name || data.name === "Неизвестный преподаватель") {
      errors.push("Отсутствует имя преподавателя")
    }

    if (!data.branch || data.branch === "Неизвестный филиал") {
      errors.push("Отсутствует филиал")
    }

    if (!data.isValidPEStatus) {
      errors.push("Некорректный статус PE")
    }

    // Логирование для отладочной цели
    if (debugTargetName && data.name === debugTargetName) {
      if (errors.length > 0) {
        pyrusDebugLogger.logTargetDetail(debugTargetName, 
          `Ошибки валидации для задачи ${data.taskId}`, errors)
      } else {
        pyrusDebugLogger.logTargetDetail(debugTargetName, 
          `Валидация пройдена для задачи ${data.taskId}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * НОВАЯ: Проверка исключения преподавателя с логированием
   */
  isTeacherExcluded(
    teacherName: string, 
    exclusionType: 'oldies' | 'trial',
    debugTargetName?: string
  ): boolean {
    // Используем импортированную функцию исключений
    const isExcluded = checkTeacherExcluded(teacherName, exclusionType)

    // Логирование для отладочной цели
    if (debugTargetName && teacherName === debugTargetName) {
      pyrusDebugLogger.logTargetDetail(debugTargetName, 
        `Проверка исключения (${exclusionType}): ${isExcluded ? 'ИСКЛЮЧЕН' : 'НЕ ИСКЛЮЧЕН'}`)
    }

    return isExcluded
  }

  /**
   * НОВАЯ: Обработка исключенного филиала с выбросом исключения
   */
  handleExcludedBranch(branchName: string): never {
    throw new Error('EXCLUDED_BRANCH')
  }
}
