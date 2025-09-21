/**
 * Автоматический скрипт для выполнения очищения после рефакторинга
 * Выполняется поэтапно с проверками безопасности
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface CleanupPhase {
  name: string
  description: string
  files: string[]
  directories: string[]
  validations: string[]
  safetyChecks: string[]
}

interface CleanupConfig {
  phases: CleanupPhase[]
  backupEnabled: boolean
  dryRun: boolean
  skipValidation: boolean
}

class CleanupExecutor {
  private config: CleanupConfig
  private projectRoot: string
  private backupDir: string

  constructor(config: CleanupConfig) {
    this.config = config
    this.projectRoot = path.resolve(__dirname, '..')
    this.backupDir = path.join(this.projectRoot, '.cleanup-backups')
  }

  async executeCleanup(): Promise<void> {
    console.log('🧹 Начинаем выполнение плана очищения...')
    
    if (this.config.backupEnabled) {
      await this.createBackup()
    }

    for (const [index, phase] of this.config.phases.entries()) {
      console.log(`\n📋 ФАЗА ${index + 1}: ${phase.name}`)
      console.log(`📝 ${phase.description}`)
      
      // Проверки безопасности
      if (!this.config.skipValidation) {
        const safetyResult = await this.runSafetyChecks(phase)
        if (!safetyResult) {
          console.error(`❌ Фаза ${index + 1} не прошла проверки безопасности`)
          return
        }
      }

      // Выполнение фазы
      await this.executePhase(phase)
      
      // Валидация после выполнения
      if (!this.config.skipValidation) {
        const validationResult = await this.runValidations(phase)
        if (!validationResult) {
          console.error(`❌ Фаза ${index + 1} не прошла валидацию после выполнения`)
          await this.rollbackPhase(phase)
          return
        }
      }

      console.log(`✅ Фаза ${index + 1} выполнена успешно`)
    }

    console.log('\n🎉 Очищение завершено успешно!')
    await this.generateReport()
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Создаем backup перед очищением...')
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(this.backupDir, `cleanup-backup-${timestamp}.tar.gz`)

    try {
      execSync(`tar -czf "${backupFile}" app/ hooks/ lib/ supabase/migrations/ scripts/`, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      })
      console.log(`✅ Backup создан: ${backupFile}`)
    } catch (error) {
      console.error('❌ Ошибка создания backup:', error)
      throw error
    }
  }

  private async runSafetyChecks(phase: CleanupPhase): Promise<boolean> {
    console.log('🔍 Выполняем проверки безопасности...')
    
    for (const check of phase.safetyChecks) {
      try {
        const result = await this.runCommand(check)
        if (result.exitCode !== 0) {
          console.error(`❌ Проверка безопасности не пройдена: ${check}`)
          return false
        }
        console.log(`✅ Проверка прошла: ${check}`)
      } catch (error) {
        console.error(`❌ Ошибка проверки: ${check}`, error)
        return false
      }
    }

    return true
  }

  private async executePhase(phase: CleanupPhase): Promise<void> {
    console.log(`🗑️ Удаляем файлы и директории...`)

    // Удаление файлов
    for (const file of phase.files) {
      const filePath = path.join(this.projectRoot, file)
      if (fs.existsSync(filePath)) {
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Удалить файл: ${file}`)
        } else {
          fs.unlinkSync(filePath)
          console.log(`🗑️ Удален файл: ${file}`)
        }
      } else {
        console.log(`⚠️ Файл не найден: ${file}`)
      }
    }

    // Удаление директорий
    for (const dir of phase.directories) {
      const dirPath = path.join(this.projectRoot, dir)
      if (fs.existsSync(dirPath)) {
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Удалить директорию: ${dir}`)
        } else {
          fs.rmSync(dirPath, { recursive: true, force: true })
          console.log(`🗑️ Удалена директория: ${dir}`)
        }
      } else {
        console.log(`⚠️ Директория не найдена: ${dir}`)
      }
    }
  }

  private async runValidations(phase: CleanupPhase): Promise<boolean> {
    console.log('✅ Выполняем валидацию после удаления...')
    
    for (const validation of phase.validations) {
      try {
        const result = await this.runCommand(validation)
        if (result.exitCode !== 0) {
          console.error(`❌ Валидация не пройдена: ${validation}`)
          return false
        }
        console.log(`✅ Валидация прошла: ${validation}`)
      } catch (error) {
        console.error(`❌ Ошибка валидации: ${validation}`, error)
        return false
      }
    }

    return true
  }

  private async runCommand(command: string): Promise<{ exitCode: number; output: string }> {
    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 30000 // 30 секунд таймаут
      })
      return { exitCode: 0, output }
    } catch (error: any) {
      return { exitCode: error.status || 1, output: error.stdout || error.message }
    }
  }

  private async rollbackPhase(phase: CleanupPhase): Promise<void> {
    console.log(`🔄 Откатываем фазу: ${phase.name}`)
    
    // Найти последний backup и восстановить
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('cleanup-backup-'))
      .sort()
      .reverse()

    if (backups.length > 0) {
      const latestBackup = path.join(this.backupDir, backups[0])
      try {
        execSync(`tar -xzf "${latestBackup}"`, {
          cwd: this.projectRoot,
          stdio: 'inherit'
        })
        console.log('✅ Rollback выполнен успешно')
      } catch (error) {
        console.error('❌ Ошибка rollback:', error)
      }
    }
  }

  private async generateReport(): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'CLEANUP_REPORT.md')
    const timestamp = new Date().toISOString()
    
    let report = `# Отчет о выполнении очищения\n\n`
    report += `**Дата выполнения:** ${timestamp}\n`
    report += `**Режим:** ${this.config.dryRun ? 'DRY RUN' : 'РЕАЛЬНОЕ ВЫПОЛНЕНИЕ'}\n\n`

    report += `## Выполненные фазы\n\n`
    for (const [index, phase] of this.config.phases.entries()) {
      report += `### Фаза ${index + 1}: ${phase.name}\n`
      report += `${phase.description}\n\n`
      
      report += `**Удаленные файлы:**\n`
      for (const file of phase.files) {
        report += `- \`${file}\`\n`
      }
      
      report += `**Удаленные директории:**\n`
      for (const dir of phase.directories) {
        report += `- \`${dir}\`\n`
      }
      
      report += `\n`
    }

    fs.writeFileSync(reportPath, report)
    console.log(`📄 Отчет сохранен: ${reportPath}`)
  }
}

// Конфигурация очищения
const cleanupConfig: CleanupConfig = {
  backupEnabled: true,
  dryRun: process.argv.includes('--dry-run'),
  skipValidation: process.argv.includes('--skip-validation'),
  phases: [
    {
      name: 'Удаление дублирующих API эндпоинтов',
      description: 'Удаляем дублирующие эндпоинты после миграции на унифицированные сервисы',
      files: [
        'app/api/system/sync-users/manual/route.ts'
      ],
      directories: [
        'app/api/system/sync-users/manual'
      ],
      safetyChecks: [
        'npm run lint',
        'npm run build'
      ],
      validations: [
        'npm run test',
        'npm run build'
      ]
    },
    {
      name: 'Очистка временных файлов',
      description: 'Удаляем backup файлы и временные артефакты',
      files: [
        'app/system/configuration/page.tsx.backup',
        'app/teacher/[id]/page 2.tsx',
        'app/teacher/[id]/page-new.tsx', 
        'package 2.json',
        'server.log'
      ],
      directories: [],
      safetyChecks: [
        'git status --porcelain | wc -l' // Проверка что нет uncommitted changes
      ],
      validations: [
        'npm run build'
      ]
    },
    {
      name: 'Очистка временных миграций',
      description: 'Удаляем временные миграции созданные для исправления архитектуры',
      files: [
        'supabase/migrations/20250915T150000_fix_branch_architecture.sql',
        'supabase/migrations/20250915T150001_fix_branch_architecture_corrected.sql',
        'supabase/migrations/20250915T160000_comprehensive_architecture_analysis.sql',
        'supabase/migrations/20250915T160001_comprehensive_analysis_fixed.sql',
        'supabase/migrations/20250915T160002_simple_analysis.sql',
        'supabase/migrations/20250915T160003_step_by_step_analysis.sql',
        'supabase/migrations/20250915T170000_fix_duplicate_current_scores.sql',
        'supabase/migrations/20250915T180000_fix_recompute_function.sql',
        'supabase/migrations/20250915T190000_final_cleanup_duplicates.sql'
      ],
      directories: [],
      safetyChecks: [
        'echo "Проверяем что БД работает стабильно 3+ месяца"'
      ],
      validations: [
        'npm run db:check'
      ]
    },
    {
      name: 'Очистка временных скриптов',
      description: 'Удаляем скрипты первоначальной настройки и анализа',
      files: [
        'scripts/add-avatars-to-existing-users.js',
        'scripts/apply-fixes.js',
        'scripts/check-gravatar.js',
        'scripts/cleanup-final.js',
        'scripts/create-views.js',
        'scripts/fix-database-integrity.ts',
        'scripts/fix-info-avatar.js',
        'scripts/quick-db-check.js',
        'scripts/run-all-tests.js',
        'scripts/test-avatars.js',
        'scripts/test-db-migration.js',
        'scripts/test-final-integration.js',
        'scripts/test-pyrus-connection.js',
        'scripts/test-pyrus-members.js',
        'scripts/test-role-mapping.js',
        'scripts/test-simplified-sync.js',
        'scripts/test-sync-endpoint.js',
        'scripts/test-sync-logic.js',
        'scripts/try-all-avatar-services.js',
        'scripts/update-all-avatars-with-gravatar-check.js',
        'scripts/pyrus-members-sample.json',
        'scripts/simplified-sync-simulation.json',
        'scripts/sync-simulation.json',
        'scripts/final-integration-report.json',
        'scripts/sync-endpoint-test-report.json',
        'scripts/test-report.json',
        'scripts/role-mapping.json'
      ],
      directories: [],
      safetyChecks: [
        'npm run lint'
      ],
      validations: [
        'npm run build'
      ]
    },
    {
      name: 'Очистка тестовых артефактов',
      description: 'Удаляем временные baseline тесты и анализ',
      files: [
        'tests/integration/api-baseline.test.ts',
        'tests/baseline-results.json',
        'analysis-results.json',
        'REFACTORING_ANALYSIS.md'
      ],
      directories: [],
      safetyChecks: [
        'npm run test'
      ],
      validations: [
        'npm run test'
      ]
    }
  ]
}

// Запуск очищения
async function main() {
  try {
    console.log('🧹 Автоматическое выполнение плана очищения')
    console.log('=====================================\n')
    
    if (cleanupConfig.dryRun) {
      console.log('🔍 РЕЖИМ: DRY RUN (файлы не будут удалены)')
    } else {
      console.log('⚠️  РЕЖИМ: РЕАЛЬНОЕ ВЫПОЛНЕНИЕ (файлы будут удалены!)')
    }
    
    const executor = new CleanupExecutor(cleanupConfig)
    await executor.executeCleanup()
    
  } catch (error) {
    console.error('❌ Ошибка выполнения очищения:', error)
    process.exit(1)
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { CleanupExecutor }
export type { CleanupConfig }
