#!/usr/bin/env tsx
/**
 * Детальная отладка ответов Pyrus API с keyset пагинацией
 * Обновлено для работы с официальной документацией Pyrus API v4
 * https://pyrus.com/en/help/api
 * 
 * Запуск (установите переменные окружения):
 * PYRUS_API_URL="..." PYRUS_LOGIN="..." PYRUS_SECURITY_KEY="..." npx tsx scripts/debug-pyrus-api.ts
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function debugPyrusAPI() {
  console.log('🔍 Детальная отладка Pyrus API (keyset пагинация)\n')
  
  const formsClient = PyrusClientFactory.createFormsClient()
  const baseClient = (formsClient as any).client || formsClient
  
  console.log('📋 Форма 2304918 - Первая страница:')
  console.log('=' .repeat(70))
  
  // Делаем прямой запрос к API (первая страница с keyset pagination)
  const response1 = await (baseClient as any).get(
    'forms/2304918/register?item_count=200&include_archived=n&sort=id'
  )
  
  console.log('Ответ API:')
  console.log(`  tasks.length: ${response1?.tasks?.length || 0}`)
  
  if (response1?.tasks?.length > 0) {
    console.log(`  Первая задача ID: ${response1.tasks[0].id}`)
    console.log(`  Последняя задача ID: ${response1.tasks[response1.tasks.length - 1].id}`)
    
    const lastTaskId = response1.tasks[response1.tasks.length - 1].id
    
    // Делаем второй запрос с keyset фильтром
    console.log('\n📋 Форма 2304918 - Вторая страница (с keyset фильтром):')
    console.log('=' .repeat(70))
    console.log(`  Используем фильтр: id=lt.${lastTaskId}`)
    
    const response2 = await (baseClient as any).get(
      `forms/2304918/register?item_count=200&include_archived=n&sort=id&id=lt.${lastTaskId}`
    )
    
    console.log('Ответ API:')
    console.log(`  tasks.length: ${response2?.tasks?.length || 0}`)
    
    if (response2?.tasks?.length > 0) {
      console.log(`  Первая задача ID: ${response2.tasks[0].id}`)
      console.log(`  Последняя задача ID: ${response2.tasks[response2.tasks.length - 1].id}`)
      
      // Проверяем, что ID строго меньше
      const firstIdPage2 = response2.tasks[0].id
      if (firstIdPage2 < lastTaskId) {
        console.log(`  ✅ Keyset работает корректно: ${firstIdPage2} < ${lastTaskId}`)
      } else {
        console.log(`  ❌ Ошибка keyset: ${firstIdPage2} >= ${lastTaskId}`)
      }
    } else {
      console.log('  ℹ️  Вторая страница пустая - все данные на первой странице')
    }
  }
  
  // Проверяем полную структуру ответа
  console.log('\n🔍 Полная структура первого ответа (первые 1000 символов):')
  console.log('=' .repeat(70))
  console.log(JSON.stringify(response1, null, 2).slice(0, 1000) + '...')
}

debugPyrusAPI().catch(console.error)


