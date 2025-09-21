# 🧹 План очищения после завершения рефакторинга

## Общие принципы очищения

**Что удаляем:**
- Дублирующие файлы и функции
- Временные migration файлы  
- Устаревшие API эндпоинты
- Неиспользуемые хуки и утилиты
- Backup файлы и временные артефакты

**Что НЕ удаляем:**
- Рабочие миграции БД (до определенной даты)
- Файлы с активными зависимостями
- Критичные конфигурационные файлы
- Документацию и тесты

---

## 📋 ФАЗА ОЧИЩЕНИЯ 1: Удаление дублирующих файлов

### 1.1 API эндпоинты для удаления

**После успешной миграции на унифицированные сервисы:**

```bash
# УДАЛИТЬ: Дублирующий эндпоинт
rm app/api/system/sync-users/manual/route.ts
rm -rf app/api/system/sync-users/manual/

# УДАЛИТЬ: Один из дублирующих sync эндпоинтов (оставляем sync-leaderboard)
# После переноса логики в общий сервис
rm app/api/system/sync-users/route.ts  # ИЛИ sync-leaderboard/route.ts
```

**Критерии для удаления:**
- ✅ Вся логика перенесена в новые сервисы
- ✅ Все клиенты переключены на новые API
- ✅ Прошло 2+ недели успешной работы
- ✅ Нет зависимостей в активном коде

### 1.2 Хуки для удаления

**После создания унифицированного useBranchOperations:**

```bash
# УДАЛИТЬ: Один из дублирующих хуков
rm hooks/use-branches.tsx         # ИЛИ
rm hooks/use-branch-management.tsx

# Оставляем более функциональный, добавляем alias для совместимости
```

**Подход к удалению:**
1. Создать `hooks/use-branch-operations.tsx` (объединенный)
2. Создать alias файлы для обратной совместимости
3. Постепенно мигрировать компоненты
4. Через месяц удалить старые хуки

### 1.3 Utility файлы для консолидации

**Удалить после объединения в сервисы:**

```bash
# Логика перенесена в lib/services/
rm lib/api/leaderboard.ts  # Заменен на LeaderboardService
rm lib/api/metrics.ts      # Заменен на MetricsService  
rm lib/api/system.ts       # Заменен на SystemService
```

---

## 📋 ФАЗА ОЧИЩЕНИЯ 2: Временные файлы и артефакты

### 2.1 Migration файлы для удаления

**Удалить через 3 месяца после успешного деплоя:**

```bash
# Временные миграции для исправления архитектуры (созданы 15.09.2025)
rm supabase/migrations/20250915T150000_fix_branch_architecture.sql
rm supabase/migrations/20250915T150001_fix_branch_architecture_corrected.sql
rm supabase/migrations/20250915T160000_comprehensive_architecture_analysis.sql
rm supabase/migrations/20250915T160001_comprehensive_analysis_fixed.sql
rm supabase/migrations/20250915T160002_simple_analysis.sql
rm supabase/migrations/20250915T160003_step_by_step_analysis.sql
rm supabase/migrations/20250915T170000_fix_duplicate_current_scores.sql
rm supabase/migrations/20250915T180000_fix_recompute_function.sql
rm supabase/migrations/20250915T190000_final_cleanup_duplicates.sql
```

**Критерии удаления миграций:**
- ✅ Прошло 3+ месяца с момента деплоя
- ✅ БД работает стабильно
- ✅ Нет планов отката к предыдущим версиям
- ✅ Есть резервные копии БД

### 2.2 Backup и временные файлы

**Удалить немедленно после успешного тестирования:**

```bash
# Backup файлы (уже удалены частично)
rm app/system/configuration/page.tsx.backup
rm app/teacher/[id]/page\ 2.tsx  
rm app/teacher/[id]/page-new.tsx

# Временные конфиги
rm package\ 2.json

# Логи разработки
rm server.log

# Временные скрипты анализа
rm scripts/test-*.js
rm scripts/simplified-*.json
rm scripts/sync-simulation.json
rm scripts/final-integration-report.json
rm scripts/sync-endpoint-test-report.json
rm scripts/test-report.json
```

### 2.3 Скрипты для удаления

**После завершения миграции данных:**

```bash
# Скрипты первоначальной настройки (больше не нужны)
rm scripts/add-avatars-to-existing-users.js
rm scripts/apply-fixes.js
rm scripts/check-gravatar.js
rm scripts/cleanup-final.js
rm scripts/create-views.js
rm scripts/fix-database-integrity.ts
rm scripts/fix-info-avatar.js
rm scripts/quick-db-check.js
rm scripts/run-all-tests.js
rm scripts/test-avatars.js
rm scripts/test-db-migration.js
rm scripts/test-final-integration.js
rm scripts/test-pyrus-connection.js
rm scripts/test-pyrus-members.js
rm scripts/test-role-mapping.js
rm scripts/test-simplified-sync.js
rm scripts/test-sync-endpoint.js
rm scripts/test-sync-logic.js
rm scripts/try-all-avatar-services.js
rm scripts/update-all-avatars-with-gravatar-check.js

# Сохранить только производственные скрипты:
# - run-integrity-fix.sh (для экстренных случаев)
# - analyze-dependencies.ts (для будущих рефакторингов)
```

---

## 📋 ФАЗА ОЧИЩЕНИЯ 3: Оптимизация структуры

### 3.1 Консолидация директорий

**После переноса в новые сервисы:**

```bash
# Создать новую структуру
mkdir -p lib/services/
mkdir -p lib/clients/
mkdir -p lib/types/shared/

# Перенести и реорганизовать
mv lib/api/* lib/clients/  # API клиенты
mv types/* lib/types/      # Общие типы

# Удалить пустые директории
rmdir lib/api/
rmdir types/ (если пустая)
```

### 3.2 Обновление импортов

**Автоматическое обновление путей импортов:**

```typescript
// Создать скрипт для массового обновления импортов
// scripts/update-imports.ts

// Заменить во всех файлах:
// from '@/lib/api/leaderboard' → '@/lib/clients/leaderboard.client'
// from '@/lib/api/system' → '@/lib/clients/system.client'  
// from '@/hooks/use-branches' → '@/hooks/use-branch-operations'
```

### 3.3 Очистка package.json

**Удалить неиспользуемые зависимости:**

```bash
# Проверить неиспользуемые пакеты
npm audit
npm list --depth=0
npx depcheck

# Удалить dev зависимости которые больше не нужны
npm uninstall vitest  # если переходим полностью на Jest
npm uninstall babel-jest ts-jest  # оставляем один
```

---

## 📋 ФАЗА ОЧИЩЕНИЯ 4: Документация и тесты

### 4.1 Обновление документации

**Обновить после завершения рефакторинга:**

```bash
# Обновить API документацию  
docs/branch-management-api.md  # Новые эндпоинты
reference.md                   # Архитектурные изменения
README.md                      # Если есть

# Удалить устаревшую документацию
rm docs/old-api-reference.md   # Если создавалась
rm STABILITY_REPORT.md         # Временный отчет
```

### 4.2 Очистка тестов

**Удалить baseline тесты после завершения:**

```bash
# Временные baseline тесты
rm tests/integration/api-baseline.test.ts
rm tests/baseline-results.json
rm analysis-results.json
rm REFACTORING_ANALYSIS.md

# Заменить на production-ready тесты
# Оставить только финальные интеграционные тесты
```

---

## 📋 ФАЗА ОЧИЩЕНИЯ 5: Финальная валидация

### 5.1 Проверка перед удалением

**Автоматические проверки:**

```bash
# Скрипт для проверки безопасности удаления
npm run lint
npm run test
npm run build

# Проверка зависимостей
npx ts-node scripts/check-dependencies.ts

# Проверка что все импорты работают
npx ts-node scripts/validate-imports.ts
```

### 5.2 Создание точки восстановления

**Перед каждой фазой очищения:**

```bash
# Создать git tag перед удалением
git tag -a cleanup-phase-1 -m "Before cleanup phase 1"
git tag -a cleanup-phase-2 -m "Before cleanup phase 2"
git tag -a cleanup-phase-3 -m "Before cleanup phase 3"

# Создать backup критичных файлов
tar -czf cleanup-backup-$(date +%Y%m%d).tar.gz \
  app/api/ hooks/ lib/ supabase/migrations/
```

---

## 🎯 Финальный результат очищения

### Что останется после очищения:

**API структура:**
```
app/api/
├── auth/[...nextauth]/route.ts
├── leaderboard/route.ts         # Унифицированный
├── metrics/
│   ├── route.ts
│   └── batch-upsert/route.ts
├── system/
│   ├── branches/[id]/route.ts
│   ├── branches/route.ts
│   ├── sync-leaderboard/route.ts  # Единый эндпоинт
│   ├── recompute-scores/route.ts
│   └── users/route.ts
└── teacher/[id]/route.ts
```

**Hooks структура:**
```
hooks/
├── use-branch-operations.tsx    # Унифицированный
├── use-leaderboard-data.tsx     # Новый
├── use-api-state.tsx           # Общий паттерн
├── use-mobile.tsx              # Без изменений
├── use-toast.ts                # Без изменений
└── use-user-role.tsx           # Без изменений
```

**Services структура:**
```
lib/
├── clients/
│   ├── leaderboard.client.ts
│   ├── metrics.client.ts
│   └── system.client.ts
├── services/
│   ├── leaderboard-sync.service.ts
│   ├── score-recomputation.service.ts
│   └── branch.service.ts
└── types/
    └── shared/
        ├── api.types.ts
        └── leaderboard.types.ts
```

### Показатели улучшения:

- **Файлов удалено:** ~15-20
- **Строк кода удалено:** ~800-1000  
- **Дублирования устранено:** 100%
- **API эндпоинтов объединено:** 3 → 1
- **Хуков объединено:** 2 → 1
- **Миграций архивировано:** 9 временных

---

## ⚠️ Важные напоминания

### Что НЕ удалять никогда:

1. **Критичные миграции БД** (init, core functionality)
2. **Рабочие API эндпоинты** (даже если кажутся неиспользуемыми)
3. **Файлы конфигурации** (next.config.mjs, tsconfig.json, etc.)
4. **Зависимости с активными импортами**
5. **Backup данных пользователей**

### Порядок удаления:

1. **Тестовые артефакты** → Немедленно
2. **Дублирующие файлы** → После 2 недель тестирования  
3. **Временные миграции** → После 3 месяцев стабильной работы
4. **Устаревшие зависимости** → После аудита безопасности

### Rollback план:

Если что-то пошло не так после удаления:

```bash
# Восстановление из git tag
git reset --hard cleanup-phase-1

# Восстановление из backup
tar -xzf cleanup-backup-20250915.tar.gz

# Восстановление отдельного файла
git checkout HEAD~1 -- path/to/deleted/file.ts
```

---

**📋 Этот план будет выполнен поэтапно после успешного завершения всех фаз рефакторинга и тщательного тестирования системы.**
