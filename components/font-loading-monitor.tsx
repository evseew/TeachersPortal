'use client'

import { useEffect } from 'react'
import { monitorFontLoading } from '@/lib/utils/font-loader'

/**
 * Компонент для мониторинга загрузки шрифтов
 * Автоматически применяет fallback стили если Google Fonts недоступен
 */
export function FontLoadingMonitor() {
  useEffect(() => {
    // Запускаем мониторинг только на клиенте
    monitorFontLoading()
  }, [])

  // Компонент невидимый, только для side-effects
  return null
}
