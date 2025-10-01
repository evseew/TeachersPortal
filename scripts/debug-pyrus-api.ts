#!/usr/bin/env tsx
/**
 * Детальная отладка ответов Pyrus API с курсорной пагинацией
 * Обновлено для работы с официальной документацией Pyrus API v4
 * 
 * Запуск: 
 * source .env.local && npx tsx scripts/debug-pyrus-api.ts
 * или
 * node --env-file=.env.local -r esbuild-register scripts/debug-pyrus-api.ts
 */

import { PyrusClientFactory } from '../lib/pyrus/client-factory'

async function debugPyrusAPI() {
  console.log('🔍 Детальная отладка Pyrus API (курсорная пагинация)\n')
  
  const formsClient = PyrusClientFactory.createFormsClient()
  const baseClient = (formsClient as any).client || formsClient
  
  console.log('📋 Форма 2304918 - Первая страница:')
  console.log('=' .repeat(70))
  
  // Делаем прямой запрос к API (первая страница)
  const response1 = await (baseClient as any).get(
    'forms/2304918/register?item_count=200&include_archived=n'
  )
  
  console.log('Ответ API:')
  console.log(`  tasks.length: ${response1?.tasks?.length || 0}`)
  console.log(`  next_cursor: ${response1?.next_cursor ? 'есть' : 'нет'}`)
  
  if (response1?.tasks?.length > 0) {
    console.log(`  Первая задача ID: ${response1.tasks[0].id}`)
    console.log(`  Последняя задача ID: ${response1.tasks[response1.tasks.length - 1].id}`)
  }
  
  // Если есть next_cursor, делаем второй запрос
  if (response1?.next_cursor) {
    console.log('\n📋 Форма 2304918 - Вторая страница (с cursor):')
    console.log('=' .repeat(70))
    
    const response2 = await (baseClient as any).get(
      `forms/2304918/register?item_count=200&include_archived=n&cursor=${encodeURIComponent(response1.next_cursor)}`
    )
    
    console.log('Ответ API:')
    console.log(`  tasks.length: ${response2?.tasks?.length || 0}`)
    console.log(`  next_cursor: ${response2?.next_cursor ? 'есть' : 'нет'}`)
    
    if (response2?.tasks?.length > 0) {
      console.log(`  Первая задача ID: ${response2.tasks[0].id}`)
      console.log(`  Последняя задача ID: ${response2.tasks[response2.tasks.length - 1].id}`)
    }
  } else {
    console.log('\n✅ API НЕ ВЕРНУЛ next_cursor - это была последняя страница!')
    console.log('Это нормально, если данных действительно больше нет.')
  }
  
  // Проверяем полную структуру ответа
  console.log('\n🔍 Полная структура первого ответа:')
  console.log('=' .repeat(70))
  console.log(JSON.stringify(response1, null, 2).slice(0, 1000) + '...')
}

debugPyrusAPI().catch(console.error)


