/**
 * Система детального логирования для отладки Pyrus-интеграций
 * Основана на логике из final_fixed_report.md
 */

export interface DebugCounters {
  [key: string]: number
}

export interface DebugTarget {
  name: string
  counters: DebugCounters
}

export class PyrusDebugLogger {
  private targets: Map<string, DebugTarget> = new Map()
  private globalCounters: DebugCounters = {}

  /**
   * Добавить цель для отладки (например, конкретного преподавателя)
   */
  addTarget(targetName: string, initialCounters: DebugCounters = {}): void {
    this.targets.set(targetName, {
      name: targetName,
      counters: { ...initialCounters }
    })
    
    console.log(`🎯 ОТЛАДКА: Добавлена цель "${targetName}"`)
  }

  /**
   * Увеличить счетчик для конкретной цели
   */
  incrementTarget(targetName: string, counterName: string, value = 1): void {
    const target = this.targets.get(targetName)
    if (target) {
      target.counters[counterName] = (target.counters[counterName] || 0) + value
      
      // Логируем важные моменты
      if (counterName.includes('processed') || counterName.includes('found')) {
        console.log(`   🔄 ${targetName}: ${counterName} = ${target.counters[counterName]}`)
      }
    }
  }

  /**
   * Увеличить глобальный счетчик
   */
  incrementGlobal(counterName: string, value = 1): void {
    this.globalCounters[counterName] = (this.globalCounters[counterName] || 0) + value
  }

  /**
   * Логировать детальную информацию для цели
   */
  logTargetDetail(targetName: string, message: string, data?: any): void {
    const target = this.targets.get(targetName)
    if (target) {
      console.log(`   📝 ${targetName}: ${message}`, data || '')
    }
  }

  /**
   * Вывести итоговую сводку по всем целям
   */
  printFinalSummary(): void {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 ФИНАЛЬНАЯ ОТЛАДОЧНАЯ СВОДКА')
    console.log('='.repeat(80))

    // Глобальные счетчики
    if (Object.keys(this.globalCounters).length > 0) {
      console.log('📊 ГЛОБАЛЬНЫЕ СЧЕТЧИКИ:')
      for (const [key, value] of Object.entries(this.globalCounters)) {
        console.log(`   ${key}: ${value}`)
      }
      console.log('')
    }

    // По каждой цели
    for (const target of this.targets.values()) {
      console.log(`🎯 ЦЕЛЬ: ${target.name}`)
      for (const [key, value] of Object.entries(target.counters)) {
        const emoji = this.getCounterEmoji(key)
        console.log(`   ${emoji} ${key}: ${value}`)
      }
      console.log('')
    }

    console.log('='.repeat(80))
  }

  /**
   * Получить emoji для счетчика
   */
  private getCounterEmoji(counterName: string): string {
    if (counterName.includes('found')) return '🔍'
    if (counterName.includes('valid')) return '✅'
    if (counterName.includes('excluded')) return '❌'
    if (counterName.includes('processed')) return '🔄'
    if (counterName.includes('error')) return '💥'
    return '📊'
  }

  /**
   * Сбросить все счетчики
   */
  reset(): void {
    this.targets.clear()
    this.globalCounters = {}
  }

  /**
   * Получить статистику по цели
   */
  getTargetStats(targetName: string): DebugCounters | null {
    const target = this.targets.get(targetName)
    return target ? { ...target.counters } : null
  }

  /**
   * Получить глобальную статистику
   */
  getGlobalStats(): DebugCounters {
    return { ...this.globalCounters }
  }
}

// Глобальный экземпляр для использования во всех Pyrus-интеграциях
export const pyrusDebugLogger = new PyrusDebugLogger()
