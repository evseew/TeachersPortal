#!/usr/bin/env tsx
/**
 * Обертка для тестирования пагинации с загрузкой переменных окружения
 */

// Загружаем переменные окружения ДО импорта других модулей
import { config } from 'dotenv'
import { resolve } from 'path'

// Загружаем .env.local
const envPath = resolve(process.cwd(), '.env.local')
config({ path: envPath })

console.log('✅ Загружены переменные окружения из .env.local')
console.log(`   PYRUS_API_URL: ${process.env.PYRUS_API_URL ? '✓' : '✗'}`)
console.log(`   PYRUS_LOGIN: ${process.env.PYRUS_LOGIN ? '✓' : '✗'}`)
console.log(`   PYRUS_SECURITY_KEY: ${process.env.PYRUS_SECURITY_KEY ? '✓' : '✗'}`)
console.log('')

// Теперь импортируем и запускаем основной тест
import('./test-pagination-fix')


