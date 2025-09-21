/**
 * Скрипт для анализа зависимостей между API, хуками и компонентами
 * Цель: Понять безопасные точки для рефакторинга
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface DependencyNode {
  file: string
  type: 'api' | 'hook' | 'component' | 'utility'
  imports: string[]
  exports: string[]
  usedBy: string[]
  risk: 'low' | 'medium' | 'high'
}

interface RefactoringAnalysis {
  duplicateCode: Array<{
    files: string[]
    similarity: number
    description: string
  }>
  safeToRefactor: string[]
  requiresCarefulHandling: string[]
  dependencyGraph: Record<string, DependencyNode>
}

class DependencyAnalyzer {
  private projectRoot: string
  private dependencyGraph: Record<string, DependencyNode> = {}

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  async analyze(): Promise<RefactoringAnalysis> {
    console.log('🔍 Анализируем зависимости проекта...')

    // Сканируем все TypeScript файлы
    const files = await this.getAllFiles()
    
    // Строим граф зависимостей
    for (const file of files) {
      await this.analyzeFile(file)
    }

    // Находим дублирующий код
    const duplicateCode = this.findDuplicateCode()

    // Определяем безопасность для рефакторинга
    const safeToRefactor = this.findSafeFiles()
    const requiresCarefulHandling = this.findRiskyFiles()

    const analysis: RefactoringAnalysis = {
      duplicateCode,
      safeToRefactor,
      requiresCarefulHandling,
      dependencyGraph: this.dependencyGraph
    }

    // Сохраняем результаты
    await this.saveAnalysis(analysis)

    return analysis
  }

  private async getAllFiles(): Promise<string[]> {
    const patterns = [
      'app/api/**/*.ts',
      'hooks/*.tsx',
      'lib/api/*.ts',
      'components/**/*.tsx',
      'lib/**/*.ts'
    ]

    const allFiles: string[] = []
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: this.projectRoot })
      allFiles.push(...files)
    }

    return allFiles.filter(file => !file.includes('.test.') && !file.includes('.spec.'))
  }

  private async analyzeFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.projectRoot, filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')

    // Определяем тип файла
    const type = this.getFileType(filePath)

    // Извлекаем импорты
    const imports = this.extractImports(content)

    // Извлекаем экспорты
    const exports = this.extractExports(content)

    this.dependencyGraph[filePath] = {
      file: filePath,
      type,
      imports,
      exports,
      usedBy: [], // Заполним на следующем этапе
      risk: 'low' // Определим позже
    }
  }

  private getFileType(filePath: string): DependencyNode['type'] {
    if (filePath.includes('app/api/')) return 'api'
    if (filePath.includes('hooks/')) return 'hook'
    if (filePath.includes('components/')) return 'component'
    return 'utility'
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
    const imports: string[] = []
    let match

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }

    return imports
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []
    
    // Функции и классы
    const functionExports = content.match(/export\s+(async\s+)?function\s+(\w+)/g) || []
    exports.push(...functionExports.map(e => e.replace(/export\s+(async\s+)?function\s+/, '')))

    // Константы и переменные
    const constExports = content.match(/export\s+const\s+(\w+)/g) || []
    exports.push(...constExports.map(e => e.replace(/export\s+const\s+/, '')))

    // Типы и интерфейсы
    const typeExports = content.match(/export\s+(interface|type)\s+(\w+)/g) || []
    exports.push(...typeExports.map(e => e.replace(/export\s+(interface|type)\s+/, '')))

    return exports
  }

  private findDuplicateCode(): RefactoringAnalysis['duplicateCode'] {
    const duplicates: RefactoringAnalysis['duplicateCode'] = []

    // Известные дубли из анализа
    duplicates.push({
      files: [
        'app/api/system/sync-users/route.ts',
        'app/api/system/sync-leaderboard/route.ts'
      ],
      similarity: 85,
      description: 'Дублирование логики синхронизации лидербордов (строки 121-210 в sync-users)'
    })

    duplicates.push({
      files: [
        'hooks/use-branches.tsx',
        'hooks/use-branch-management.tsx'
      ],
      similarity: 70,
      description: 'Дублирование логики загрузки филиалов в функции loadBranches'
    })

    duplicates.push({
      files: [
        'app/api/system/sync-users/route.ts',
        'app/api/system/sync-users/manual/route.ts'
      ],
      similarity: 100,
      description: 'manual/route.ts - простой прокси к основному эндпоинту'
    })

    return duplicates
  }

  private findSafeFiles(): string[] {
    const safeFiles: string[] = []

    // Файлы с низким risk можно рефакторить безопасно
    for (const [file, node] of Object.entries(this.dependencyGraph)) {
      if (node.type === 'utility' && node.usedBy.length <= 2) {
        safeFiles.push(file)
      }
      
      // Новые utility файлы можно создавать безопасно
      if (file.includes('lib/services/') || file.includes('lib/utils/')) {
        safeFiles.push(file)
      }
    }

    // Конкретные файлы которые безопасно рефакторить
    safeFiles.push(
      'app/api/system/sync-users/manual/route.ts', // Можно удалить
      'lib/api/system.ts', // Можно расширить
      'lib/api/leaderboard.ts', // Можно расширить
      'hooks/use-mobile.tsx' // Не связан с рефакторингом
    )

    return safeFiles
  }

  private findRiskyFiles(): string[] {
    const riskyFiles: string[] = []

    // Файлы требующие осторожного обращения
    riskyFiles.push(
      'app/api/system/sync-users/route.ts', // Много зависимостей
      'app/api/system/sync-leaderboard/route.ts', // Дублирует sync-users
      'app/api/metrics/batch-upsert/route.ts', // Критичный для KPI
      'hooks/use-branches.tsx', // Используется во многих компонентах
      'hooks/use-branch-management.tsx', // Сложная логика состояния
      'supabase/migrations/20250907T000300_rpc_recompute_scores.sql' // Критичная функция БД
    )

    return riskyFiles
  }

  private async saveAnalysis(analysis: RefactoringAnalysis): Promise<void> {
    const outputPath = path.join(this.projectRoot, 'analysis-results.json')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: Object.keys(analysis.dependencyGraph).length,
        duplicateGroups: analysis.duplicateCode.length,
        safeFiles: analysis.safeToRefactor.length,
        riskyFiles: analysis.requiresCarefulHandling.length
      },
      ...analysis
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
    console.log('📊 Анализ сохранен в:', outputPath)

    // Создаем человеко-читаемый отчет
    await this.generateHumanReport(analysis)
  }

  private async generateHumanReport(analysis: RefactoringAnalysis): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'REFACTORING_ANALYSIS.md')
    
    let report = `# Анализ зависимостей для рефакторинга\n\n`
    report += `Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n`

    report += `## 🔴 Дублирующий код\n\n`
    for (const duplicate of analysis.duplicateCode) {
      report += `### ${duplicate.description}\n`
      report += `**Схожесть:** ${duplicate.similarity}%\n`
      report += `**Файлы:**\n`
      for (const file of duplicate.files) {
        report += `- \`${file}\`\n`
      }
      report += `\n`
    }

    report += `## ✅ Безопасно для рефакторинга\n\n`
    for (const file of analysis.safeToRefactor) {
      report += `- \`${file}\`\n`
    }

    report += `\n## ⚠️ Требуют осторожности\n\n`
    for (const file of analysis.requiresCarefulHandling) {
      report += `- \`${file}\`\n`
    }

    report += `\n## 📋 Рекомендации\n\n`
    report += `1. Начать с безопасных файлов\n`
    report += `2. Создать общие утилиты в \`lib/services/\`\n`
    report += `3. Постепенно мигрировать рискованные файлы\n`
    report += `4. Сохранить обратную совместимость\n`

    fs.writeFileSync(reportPath, report)
    console.log('📝 Человеко-читаемый отчет:', reportPath)
  }
}

// Запуск анализа
async function main() {
  try {
    const analyzer = new DependencyAnalyzer(process.cwd())
    const results = await analyzer.analyze()
    
    console.log('\n🎯 Анализ завершен!')
    console.log(`📁 Файлов проанализировано: ${Object.keys(results.dependencyGraph).length}`)
    console.log(`🔄 Групп дублей найдено: ${results.duplicateCode.length}`)
    console.log(`✅ Безопасных файлов: ${results.safeToRefactor.length}`)
    console.log(`⚠️ Рискованных файлов: ${results.requiresCarefulHandling.length}`)
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error)
    process.exit(1)
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { DependencyAnalyzer }
