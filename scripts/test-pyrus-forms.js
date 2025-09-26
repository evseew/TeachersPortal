#!/usr/bin/env node
/**
 * Тестовый скрипт для отладки структуры полей в формах Pyrus
 * 
 * Использование:
 *   node scripts/test-pyrus-forms.js <form_id> <task_id>
 * 
 * Примеры:
 *   node scripts/test-pyrus-forms.js 2304918 283768656
 *   node scripts/test-pyrus-forms.js 792300 283768656
 * 
 * Анализирует:
 * 1. Структуру полей в задаче
 * 2. Значения важных полей (преподаватель, филиал, статус "учится")
 * 3. Сравнение с текущей логикой извлечения полей
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Загружаем переменные окружения
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

// Константы для полей (из check_task.py)
const FORM_FIELDS = {
  2304918: {
    name: "Форма старичков",
    fields: {
      teacher: 8,    // Поле с преподавателем
      branch: 5,     // Поле с филиалом  
      studying: 64,  // "УЧИТСЯ (заполняет СО)"
      status: 7,     // Статус PE
      // Поля для проверки посещаемости
      lesson1: 27,   // "Прошел ли 1-е занятие?"
      lesson2: 32,   // "Прошел ли 2-е занятие?"
      lesson3: 50,   // "Прошел ли 3-е занятие?"
      lesson4: 57,   // "Прошел ли 4-е занятие?"
      exitStatus: 25 // "Статус выхода"
    }
  },
  792300: {
    name: "Форма новый клиент",
    fields: {
      teacher: 142,  // Поле с преподавателем
      branch: 226,   // Поле с филиалом
      studying: 187, // "УЧИТСЯ"
      status: 228,   // Статус PE
      // Поля для проверки посещаемости
      lesson1: 183,  // "Пришел на 1-е занятие?"
      lesson2: 198   // "Пришел на 2-е занятие?"
    }
  }
}

class PyrusFormsDebugger {
  constructor() {
    this.baseUrl = process.env.PYRUS_API_URL || 'https://api.pyrus.com/v4/'
    this.login = process.env.PYRUS_LOGIN
    this.securityKey = process.env.PYRUS_SECURITY_KEY
    this.accessToken = null
  }

  /**
   * Авторизация в Pyrus API
   */
  async authenticate() {
    if (!this.login || !this.securityKey) {
      throw new Error('Не установлены переменные окружения PYRUS_LOGIN и PYRUS_SECURITY_KEY')
    }

    try {
      const response = await fetch(`${this.baseUrl}auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: this.login,
          security_key: this.securityKey
        })
      })

      if (!response.ok) {
        throw new Error(`Ошибка авторизации: ${response.status}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      console.log('✅ Успешная авторизация в Pyrus API')
      return this.accessToken
    } catch (error) {
      throw new Error(`Ошибка при авторизации: ${error.message}`)
    }
  }

  /**
   * Получение данных задачи
   */
  async getTask(taskId) {
    if (!this.accessToken) {
      await this.authenticate()
    }

    try {
      const response = await fetch(`${this.baseUrl}tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Токен истек, получаем новый
          await this.authenticate()
          return this.getTask(taskId)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.task
    } catch (error) {
      throw new Error(`Ошибка получения задачи: ${error.message}`)
    }
  }

  /**
   * Получение метаданных формы
   */
  async getFormMeta(formId) {
    if (!this.accessToken) {
      await this.authenticate()
    }

    try {
      const response = await fetch(`${this.baseUrl}forms/${formId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          await this.authenticate()
          return this.getFormMeta(formId)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.form
    } catch (error) {
      console.warn(`⚠️ Не удалось получить метаданные формы: ${error.message}`)
      return null
    }
  }

  /**
   * Извлечение значения поля (логика из check_task.py)
   */
  getFieldValue(taskFields, fieldId) {
    for (const field of taskFields || []) {
      if (field.id === fieldId) {
        return field.value
      }
      // Рекурсивный поиск во вложенных секциях
      const value = field.value
      if (value && typeof value === 'object' && Array.isArray(value.fields)) {
        const nestedValue = this.getFieldValue(value.fields, fieldId)
        if (nestedValue !== null && nestedValue !== undefined) {
          return nestedValue
        }
      }
    }
    return null
  }

  /**
   * Извлечение текстового значения из поля
   */
  extractTextValue(fieldValue) {
    if (!fieldValue) return null
    
    if (typeof fieldValue === 'string') {
      return fieldValue
    }
    
    if (typeof fieldValue === 'object') {
      // Для чекбоксов
      if (fieldValue.checkmark) {
        return fieldValue.checkmark
      }
      // Для текстовых полей
      return fieldValue.text || fieldValue.value || fieldValue.name || null
    }
    
    return null
  }

  /**
   * Проверка статуса "учится"
   */
  isStudying(taskFields, fieldId) {
    const value = this.getFieldValue(taskFields, fieldId)
    
    if (!value) return false
    
    // Булево значение
    if (typeof value === 'boolean') return value
    
    // Строковое значение
    if (typeof value === 'string') {
      return ['да', 'yes', 'true', 'checked'].includes(value.toLowerCase())
    }
    
    // Объект с чекбоксом
    if (typeof value === 'object' && value.checkmark === 'checked') {
      return true
    }
    
    return false
  }

  /**
   * Анализ задачи
   */
  async analyzeTask(formId, taskId) {
    console.log(`🔍 Анализируем задачу ${taskId} формы ${formId}...`)
    
    try {
      // Получаем данные
      const [taskData, formMeta] = await Promise.all([
        this.getTask(taskId),
        this.getFormMeta(formId)
      ])

      if (!taskData) {
        throw new Error(`Задача ${taskId} не найдена`)
      }

      const formConfig = FORM_FIELDS[formId]
      if (!formConfig) {
        throw new Error(`Неизвестная форма: ${formId}`)
      }

      const taskFields = taskData.fields || []
      
      console.log('\n' + '='.repeat(80))
      console.log(`📋 АНАЛИЗ ЗАДАЧИ PYRUS`)
      console.log('='.repeat(80))
      console.log(`🆔 ID задачи: ${taskId}`)
      console.log(`📝 Название: ${taskData.subject || taskData.text || `Задача #${taskId}`}`)
      console.log(`📄 Форма: ${formConfig.name} (ID: ${formId})`)
      console.log(`🔗 Ссылка: https://pyrus.com/t#id${taskId}`)
      console.log(`📊 Полей в задаче: ${taskFields.length}`)
      
      // Анализ важных полей
      console.log('\n📋 ВАЖНЫЕ ПОЛЯ:')
      const importantFields = {}
      
      for (const [fieldName, fieldId] of Object.entries(formConfig.fields)) {
        const value = this.getFieldValue(taskFields, fieldId)
        const textValue = this.extractTextValue(value)
        
        console.log(`   ${fieldName} (ID:${fieldId}): ${JSON.stringify(value)} -> "${textValue}"`)
        importantFields[fieldName] = { raw: value, text: textValue }
      }

      // Проверка статуса "учится"
      const studyingStatus = this.isStudying(taskFields, formConfig.fields.studying)
      console.log(`\n🎓 СТАТУС "УЧИТСЯ": ${studyingStatus ? '✅ ДА' : '❌ НЕТ'}`)

      // Отладочная информация - все поля
      console.log('\n🐛 ВСЕ ПОЛЯ ЗАДАЧИ:')
      taskFields.forEach(field => {
        console.log(`   ID:${field.id} "${field.name || 'Без названия'}": ${JSON.stringify(field.value)}`)
      })

      return {
        taskId,
        formId,
        formName: formConfig.name,
        taskTitle: taskData.subject || taskData.text || `Задача #${taskId}`,
        fieldsCount: taskFields.length,
        importantFields,
        studyingStatus,
        allFields: taskFields.map(field => ({
          id: field.id,
          name: field.name || 'Без названия',
          value: field.value
        }))
      }

    } catch (error) {
      console.error(`❌ ОШИБКА: ${error.message}`)
      return null
    }
  }
}

// Главная функция
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length !== 2) {
    console.log('Использование: node scripts/test-pyrus-forms.js <form_id> <task_id>')
    console.log('Примеры:')
    console.log('  node scripts/test-pyrus-forms.js 2304918 283768656')
    console.log('  node scripts/test-pyrus-forms.js 792300 283768656')
    process.exit(1)
  }

  const [formIdStr, taskIdStr] = args
  const formId = parseInt(formIdStr, 10)
  const taskId = parseInt(taskIdStr, 10)

  if (isNaN(formId) || isNaN(taskId)) {
    console.error('❌ Ошибка: ID формы и задачи должны быть числами')
    process.exit(1)
  }

  try {
    const formsDebugger = new PyrusFormsDebugger()
    const result = await formsDebugger.analyzeTask(formId, taskId)
    
    if (result) {
      console.log('\n✅ Анализ завершен успешно')
      
      // Сохраняем результат в файл для дальнейшего анализа
      const fs = await import('fs/promises')
      const outputFile = `scripts/debug-task-${taskId}-form-${formId}.json`
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2))
      console.log(`📁 Результат сохранен в: ${outputFile}`)
    }
  } catch (error) {
    console.error(`❌ Критическая ошибка: ${error.message}`)
    process.exit(1)
  }
}

// Запуск, если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
