#!/usr/bin/env ts-node
/**
 * Тест новых функций извлечения полей на реальных данных
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { 
  getFieldValue, 
  extractTextValue, 
  isCheckboxChecked, 
  extractPersonName, 
  extractBranchName,
  isStudying,
  extractTeacher,
  extractBranch,
  PyrusField
} from '../lib/pyrus/field-extractor'

// Загружаем реальные данные из JSON файлов
function loadTaskData(formId: number): any {
  const files = {
    2304918: 'debug-form-2304918-task-302953976.json',
    792300: 'debug-form-792300-task-307785818.json'
  }
  
  const filename = files[formId as keyof typeof files]
  if (!filename) {
    throw new Error(`Неизвестная форма: ${formId}`)
  }
  
  try {
    const filePath = join(__dirname, filename)
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    return data
  } catch (error) {
    console.error(`❌ Не удалось загрузить файл ${filename}:`, error)
    return null
  }
}

function testForm2304918() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 ТЕСТ ФОРМЫ 2304918 (старички)')
  console.log('='.repeat(60))
  
  const taskData = loadTaskData(2304918)
  if (!taskData) return
  
  const fields: PyrusField[] = taskData.fields
  console.log(`📊 Загружено полей: ${fields.length}`)
  
  // Тестируем важные поля
  const fieldTests = {
    8: 'Преподаватель',
    5: 'Филиал', 
    64: 'УЧИТСЯ (заполняет СО)',
    7: 'Статус PE',
    27: 'Пришел на первое занятие?',
    25: 'Статус выхода'
  }
  
  console.log('\n🔍 ТЕСТ ИЗВЛЕЧЕНИЯ ПОЛЕЙ:')
  for (const [fieldId, fieldName] of Object.entries(fieldTests)) {
    const id = parseInt(fieldId, 10)
    const rawValue = getFieldValue(fields, id)
    const textValue = extractTextValue(rawValue)
    const isChecked = isCheckboxChecked(rawValue)
    
    console.log(`\n  ID:${id.toString().padStart(2)} ${fieldName}`)
    console.log(`    Raw: ${JSON.stringify(rawValue)}`)
    console.log(`    Text: "${textValue}"`)
    console.log(`    Checked: ${isChecked}`)
    
    // Специальные тесты
    if (id === 8) { // Преподаватель
      const teacherName = extractPersonName(rawValue)
      console.log(`    Person: "${teacherName}"`)
    }
    
    if (id === 5) { // Филиал
      const branchName = extractBranchName(rawValue)
      console.log(`    Branch: "${branchName}"`)
    }
  }
  
  // Тест высокоуровневых функций
  console.log('\n🎯 ТЕСТ ВЫСОКОУРОВНЕВЫХ ФУНКЦИЙ:')
  console.log(`  Преподаватель: "${extractTeacher(fields, 8)}"`)
  console.log(`  Филиал: "${extractBranch(fields, 5)}"`)
  console.log(`  Учится: ${isStudying(fields, 64)}`)
}

function testForm792300() {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 ТЕСТ ФОРМЫ 792300 (новый клиент)')
  console.log('='.repeat(60))
  
  const taskData = loadTaskData(792300)
  if (!taskData) return
  
  const fields: PyrusField[] = taskData.fields
  console.log(`📊 Загружено полей: ${fields.length}`)
  
  // Тестируем важные поля
  const fieldTests = {
    142: 'Преподаватель',
    226: 'Филиал',
    187: 'УЧИТСЯ',
    228: 'Статус PE',
    183: 'Пришел на 1-е занятие?',
    198: 'Пришел на 2-е занятие?'
  }
  
  console.log('\n🔍 ТЕСТ ИЗВЛЕЧЕНИЯ ПОЛЕЙ:')
  for (const [fieldId, fieldName] of Object.entries(fieldTests)) {
    const id = parseInt(fieldId, 10)
    const rawValue = getFieldValue(fields, id)
    const textValue = extractTextValue(rawValue)
    const isChecked = isCheckboxChecked(rawValue)
    
    console.log(`\n  ID:${id.toString().padStart(3)} ${fieldName}`)
    console.log(`    Raw: ${JSON.stringify(rawValue)}`)
    console.log(`    Text: "${textValue}"`)
    console.log(`    Checked: ${isChecked}`)
    
    // Специальные тесты
    if (id === 142) { // Преподаватель
      const teacherName = extractPersonName(rawValue)
      console.log(`    Person: "${teacherName}"`)
    }
    
    if (id === 226) { // Филиал
      const branchName = extractBranchName(rawValue)
      console.log(`    Branch: "${branchName}"`)
    }
  }
  
  // Тест высокоуровневых функций
  console.log('\n🎯 ТЕСТ ВЫСОКОУРОВНЕВЫХ ФУНКЦИЙ:')
  console.log(`  Преподаватель: "${extractTeacher(fields, 142)}"`)
  console.log(`  Филиал: "${extractBranch(fields, 226)}"`)
  console.log(`  Учится: ${isStudying(fields, 187)}`)
}

async function main() {
  console.log('🧪 ТЕСТИРОВАНИЕ ФУНКЦИЙ ИЗВЛЕЧЕНИЯ ПОЛЕЙ PYRUS')
  
  try {
    testForm2304918()
    testForm792300()
    
    console.log('\n✅ Все тесты завершены!')
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error instanceof Error ? error.message : String(error))
  }
}

main()
