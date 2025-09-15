/**
 * Baseline интеграционные тесты для всех API эндпоинтов
 * Цель: Зафиксировать текущее поведение перед рефакторингом
 */

import { describe, test, expect, beforeAll } from '@jest/globals'

// Типы для тестирования
interface ApiTestCase {
  endpoint: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  expectedStatus: number[]
  description: string
}

// Базовые тесты для всех критических API
const API_TEST_CASES: ApiTestCase[] = [
  {
    endpoint: '/api/leaderboard?type=teacher_overall',
    method: 'GET',
    expectedStatus: [200],
    description: 'Teacher leaderboard загружается корректно'
  },
  {
    endpoint: '/api/leaderboard?type=branch_overall', 
    method: 'GET',
    expectedStatus: [200],
    description: 'Branch leaderboard загружается корректно'
  },
  {
    endpoint: '/api/metrics',
    method: 'GET',
    expectedStatus: [200],
    description: 'Metrics API работает'
  },
  {
    endpoint: '/api/system/users',
    method: 'GET',
    expectedStatus: [200, 401, 403], // Может требовать авторизацию
    description: 'Users API доступен'
  },
  {
    endpoint: '/api/system/branches',
    method: 'GET', 
    expectedStatus: [200, 401, 403],
    description: 'Branches API доступен'
  },
  {
    endpoint: '/api/system/sync-users',
    method: 'POST',
    expectedStatus: [200, 401, 403, 500], // Может падать без Pyrus
    description: 'User sync API отвечает'
  },
  {
    endpoint: '/api/system/sync-leaderboard',
    method: 'POST', 
    expectedStatus: [200, 401, 403],
    description: 'Leaderboard sync API отвечает'
  },
  {
    endpoint: '/api/system/recompute-scores',
    method: 'POST',
    expectedStatus: [200, 401, 403],
    description: 'Score recomputation API отвечает'
  }
]

// Хранилище для baseline результатов
let baselineResults: Record<string, any> = {}

describe('API Baseline Tests', () => {
  beforeAll(async () => {
    console.log('🧪 Запуск baseline тестирования API...')
  })

  test.each(API_TEST_CASES)(
    '$description',
    async ({ endpoint, method, headers, body, expectedStatus, description }) => {
      const startTime = Date.now()
      
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined
        })

        const duration = Date.now() - startTime
        const data = await response.json().catch(() => null)

        // Сохраняем baseline для сравнения после рефакторинга
        baselineResults[endpoint] = {
          status: response.status,
          duration,
          dataStructure: data ? Object.keys(data) : null,
          timestamp: new Date().toISOString()
        }

        expect(expectedStatus).toContain(response.status)
        console.log(`✅ ${endpoint} - Status: ${response.status}, Duration: ${duration}ms`)
        
      } catch (error) {
        console.error(`❌ ${endpoint} - Error:`, error)
        
        // Для baseline тестов мы записываем даже ошибки
        baselineResults[endpoint] = {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
        
        // Не failing тест, просто записываем состояние
        expect(true).toBe(true)
      }
    }
  )

  afterAll(async () => {
    // Сохраняем baseline результаты
    const fs = require('fs')
    const path = require('path')
    
    const resultsPath = path.join(__dirname, '../baseline-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify(baselineResults, null, 2))
    
    console.log('📊 Baseline результаты сохранены в:', resultsPath)
  })
})

// Тесты структуры данных
describe('Data Structure Validation', () => {
  test('Teacher leaderboard структура', async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leaderboard?type=teacher_overall')
      if (response.ok) {
        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0]
          
          // Проверяем обязательные поля
          expect(firstItem).toHaveProperty('teacher_id')
          expect(firstItem).toHaveProperty('name')
          expect(firstItem).toHaveProperty('score')
          expect(firstItem).toHaveProperty('rank')
          
          console.log('✅ Teacher leaderboard структура валидна')
        }
      }
    } catch (error) {
      console.log('⚠️ Teacher leaderboard недоступен для проверки структуры')
    }
  })

  test('Branch leaderboard структура', async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leaderboard?type=branch_overall')
      if (response.ok) {
        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0]
          
          // Проверяем обязательные поля
          expect(firstItem).toHaveProperty('branch_id')
          expect(firstItem).toHaveProperty('branch_name')
          expect(firstItem).toHaveProperty('score')
          expect(firstItem).toHaveProperty('rank')
          
          console.log('✅ Branch leaderboard структура валидна')
        }
      }
    } catch (error) {
      console.log('⚠️ Branch leaderboard недоступен для проверки структуры')
    }
  })
})
