/**
 * Baseline тесты для хуков работы с филиалами
 * Цель: Зафиксировать поведение перед объединением useBranches и useBranchManagement
 */

import { renderHook, waitFor } from '@testing-library/react'
import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { useBranches } from '../../hooks/use-branches'
import { useBranchManagement } from '../../hooks/use-branch-management'

// Мокаем API функции
jest.mock('../../lib/api/system', () => ({
  listBranches: jest.fn(),
  createBranch: jest.fn(),
  updateBranch: jest.fn(),
  deleteBranch: jest.fn()
}))

jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

const mockBranches = [
  { id: '1', name: 'Филиал 1' },
  { id: '2', name: 'Филиал 2' },
  { id: '3', name: 'Филиал 3' }
]

describe('useBranches Hook Baseline', () => {
  const { listBranches } = require('../../lib/api/system')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('должен загружать филиалы при монтировании', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result } = renderHook(() => useBranches())

    // Начальное состояние
    expect(result.current.loading).toBe(true)
    expect(result.current.branches).toEqual([])
    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // После загрузки
    expect(result.current.branches).toEqual(mockBranches)
    expect(result.current.error).toBe(null)
    expect(listBranches).toHaveBeenCalledTimes(1)
  })

  test('должен обрабатывать ошибки загрузки', async () => {
    const errorMessage = 'Failed to load branches'
    listBranches.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useBranches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.branches).toEqual([])
  })

  test('refetch должен работать корректно', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result } = renderHook(() => useBranches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Вызываем refetch
    result.current.refetch()

    // Проверяем что вызов API произошел повторно
    await waitFor(() => {
      expect(listBranches).toHaveBeenCalledTimes(2)
    })
  })
})

describe('useBranchManagement Hook Baseline', () => {
  const { listBranches, createBranch, updateBranch, deleteBranch } = require('../../lib/api/system')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('должен загружать филиалы через loadBranches', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result } = renderHook(() => useBranchManagement())

    // Начальное состояние
    expect(result.current.loading).toBe(true)
    expect(result.current.branches).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.branches).toEqual(mockBranches)
  })

  test('должен создавать филиал с валидацией', async () => {
    listBranches.mockResolvedValue(mockBranches)
    const newBranch = { id: '4', name: 'Новый филиал' }
    createBranch.mockResolvedValue(newBranch)

    const { result } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Создаем филиал
    const success = await result.current.createBranch({ name: 'Новый филиал' })

    expect(success).toBe(true)
    expect(createBranch).toHaveBeenCalledWith('Новый филиал')
  })

  test('должен валидировать пустое название', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Пытаемся создать с пустым названием
    const success = await result.current.createBranch({ name: '' })

    expect(success).toBe(false)
    expect(createBranch).not.toHaveBeenCalled()
  })

  test('должен валидировать дублирование названий', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Пытаемся создать с существующим названием
    const success = await result.current.createBranch({ name: 'Филиал 1' })

    expect(success).toBe(false)
    expect(createBranch).not.toHaveBeenCalled()
  })

  test('должен обновлять филиал', async () => {
    listBranches.mockResolvedValue(mockBranches)
    const updatedBranch = { id: '1', name: 'Обновленный филиал' }
    updateBranch.mockResolvedValue(updatedBranch)

    const { result } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const success = await result.current.updateBranch('1', { name: 'Обновленный филиал' })

    expect(success).toBe(true)
    expect(updateBranch).toHaveBeenCalledWith('1', 'Обновленный филиал')
  })

  test('должен удалять филиал', async () => {
    listBranches.mockResolvedValue(mockBranches)
    deleteBranch.mockResolvedValue(undefined)

    const { result } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const success = await result.current.deleteBranch('1')

    expect(success).toBe(true)
    expect(deleteBranch).toHaveBeenCalledWith('1')
  })
})

// Тест для сравнения поведения двух хуков
describe('Hook Behavior Comparison', () => {
  const { listBranches } = require('../../lib/api/system')

  test('оба хука должны загружать одинаковые данные', async () => {
    listBranches.mockResolvedValue(mockBranches)

    const { result: useBranchesResult } = renderHook(() => useBranches())
    const { result: useManagementResult } = renderHook(() => useBranchManagement())

    await waitFor(() => {
      expect(useBranchesResult.current.loading).toBe(false)
      expect(useManagementResult.current.loading).toBe(false)
    })

    // Данные должны быть идентичными
    expect(useBranchesResult.current.branches).toEqual(useManagementResult.current.branches)
    expect(useBranchesResult.current.error).toEqual(useManagementResult.current.error)
  })
})
