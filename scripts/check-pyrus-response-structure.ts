#!/usr/bin/env tsx
/**
 * Проверка структуры ответа Pyrus API
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function checkResponseStructure() {
  console.log('🔍 Проверка структуры ответа Pyrus API\n')
  
  const formsClient = PyrusClientFactory.createFormsClient()
  const baseClient = (formsClient as any).client || formsClient
  
  // Первый запрос
  const response = await (baseClient as any).get(
    'forms/2304918/register?item_count=200&include_archived=n'
  )
  
  if (!response) {
    console.log('❌ Не удалось получить ответ от API')
    return
  }
  
  console.log('📦 Корневые поля ответа API:')
  console.log('=' .repeat(70))
  Object.keys(response).forEach(key => {
    const value = response[key]
    const type = Array.isArray(value) ? `Array[${value.length}]` : typeof value
    console.log(`  ${key}: ${type}`)
  })
  
  console.log('\n📊 Детальная информация:')
  console.log('=' .repeat(70))
  
  if (response.tasks) {
    console.log(`  ✅ tasks: массив из ${response.tasks.length} элементов`)
  }
  
  if (response.next_cursor !== undefined) {
    console.log(`  ✅ next_cursor: "${response.next_cursor}"`)
  } else {
    console.log(`  ❌ next_cursor: ОТСУТСТВУЕТ`)
  }
  
  if (response.has_more !== undefined) {
    console.log(`  ℹ️  has_more: ${response.has_more}`)
  } else {
    console.log(`  ❌ has_more: ОТСУТСТВУЕТ`)
  }
  
  if (response.next_task_id !== undefined) {
    console.log(`  ℹ️  next_task_id: ${response.next_task_id}`)
  } else {
    console.log(`  ❌ next_task_id: ОТСУТСТВУЕТ`)
  }
  
  console.log('\n🔍 Полный ответ (первые 2000 символов):')
  console.log('=' .repeat(70))
  console.log(JSON.stringify(response, null, 2).slice(0, 2000))
}

checkResponseStructure().catch(console.error)

