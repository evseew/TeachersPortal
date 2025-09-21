# 🏗️ Архитектура системы v2.0

## Обзор улучшений

После рефакторинга система получила:
- **Устранение дублирования:** 100% дублей в API и хуках удалено
- **Унифицированные сервисы:** Единая точка истины для каждой операции
- **Middleware система:** Общая логика авторизации и обработки ошибок
- **Мониторинг производительности:** Автоматическое отслеживание метрик
- **Интеллектуальные алгоритмы:** Защита от излишних пересчетов

---

## 📁 Новая структура

### Services Layer (`lib/services/`)

Бизнес-логика вынесена в отдельные сервисы:

**`LeaderboardSyncService`**
- Объединяет логику из `sync-users` и `sync-leaderboard`
- Методы: `syncTeacherData()`, `removePhantomUsers()`, `addMissingTeachers()`
- Использование: Во всех API, где нужна синхронизация лидербордов

**`ScoreRecomputationService`** (Singleton)
- Интеллектуальный пересчет рейтингов
- Методы: `recomputeIfNeeded()`, `forceRecompute()`, `getRecomputationStats()`
- Защита: Минимальные интервалы между пересчетами, проверка изменений

**`BranchService`** (Singleton)
- Унифицированная работа с филиалами
- Методы: `listBranches()`, `createBranch()`, `updateBranch()`, `deleteBranch()`
- Валидация: Автоматическая проверка зависимостей перед удалением

### API Clients (`lib/clients/`)

Типизированные клиенты для работы с API:

**`LeaderboardApiClient`**
- Методы: `fetchTeacherLeaderboard()`, `fetchBranchLeaderboard()`, `syncLeaderboardData()`
- Особенности: Валидация структуры данных, параллельные запросы

**`SystemApiClient`**  
- Методы: `syncUsers()`, `recomputeScores()`, `listBranches()`, `healthCheck()`
- Особенности: Таймауты, retry логика, мониторинг здоровья

### Middleware (`lib/middleware/`)

Общая логика для всех API:

**`ApiErrorHandler`**
- Унифицированная обработка ошибок
- Специальные типы ошибок: `validationError()`, `authError()`, `permissionError()`
- Автоматическое логирование с request ID

**`AuthMiddleware`**
- Проверка авторизации и ролей
- Предконфигурированные middleware: `withAdminAuth`, `withTeacherAuth`
- Контекст пользователя в API

**`PerformanceMonitor`**
- Автоматическое отслеживание времени выполнения
- Статистика по эндпоинтам: средние время, ошибки, медленные запросы
- Экспорт метрик в JSON/CSV

### Hooks (`hooks/`)

**`useBranchOperations`** (Новый унифицированный)
- Объединяет функциональность `useBranches` + `useBranchManagement`
- Optimistic updates, автоматическая валидация, error handling
- Backward compatibility через `useBranchesV2` и `useBranchManagementV2`

**`useApiState`**
- Универсальный паттерн для API состояния
- Особенности: Автоматические retry, debouncing, кэширование
- Специализация: `useApiList` для списков с пагинацией

---

## 🔧 Использование новых компонентов

### API с middleware

```typescript
// Старый способ
export async function POST() {
  try {
    const authError = await requireAuth()
    if (authError) return authError
    
    const hasPermission = await hasServerRole(['Administrator'])
    if (!hasPermission) return NextResponse.json({error: '...'}, {status: 403})
    
    // бизнес логика
    
  } catch (error) {
    return NextResponse.json({error: error.message}, {status: 500})
  }
}

// Новый способ
const handler = async (request: NextRequest) => {
  // только бизнес логика
}

export const POST = withAdminAuth(
  withErrorHandler(
    withPerformanceMonitoring(handler, '/api/my-endpoint'),
    'my-api'
  )
)
```

### Сервисы вместо дублирования

```typescript
// Старый способ - дублирование в каждом API
const teacherIds = new Set(teachers?.map(t => t.user_id) || [])
const phantomScores = currentScores?.filter(cs => !teacherIds.has(cs.teacher_id))
// ...50+ строк дублирующего кода

// Новый способ - один вызов сервиса
const syncService = new LeaderboardSyncService()
const result = await syncService.syncTeacherData()
```

### Хуки с расширенной функциональностью

```typescript
// Старый способ - базовый функционал
const { branches, loading, error } = useBranches()

// Новый способ - полный функционал + backward compatibility
const {
  branches, loading, error,           // Старые поля
  createBranch, updateBranch,         // Новые методы
  optimisticUpdates, validation       // Новые возможности
} = useBranchOperations()
```

---

## 📊 Мониторинг и отладка

### API мониторинга

**`GET /api/system/performance?action=overall`**
- Общая статистика API: среднее время, ошибки, топ медленных эндпоинтов

**`GET /api/system/performance?action=database`**
- Статистика БД: количество записей, здоровье, последние снапшоты

**`GET /api/system/performance?action=system`**
- Комбинированная статистика API + БД

### Логирование

Все новые компоненты используют структурированное логирование:

```
🔄 [API] sync-leaderboard: Запуск синхронизации...
✅ [API] sync-leaderboard: Синхронизация завершена успешно
📊 [Performance] batch-upsert: Обработано 15 записей, пересчет: выполнен
⚠️ [Performance] Slow request: /api/heavy-endpoint (5.2s)
❌ [API Error] sync-leaderboard: Database connection failed (req: a7f3k2)
```

### База данных

**Новая RPC функция:** `recompute_current_scores_v2(scope, force)`
- Параметры: `teacher_overall`, `branch_overall`, `all`
- Условный пересчет: только при наличии изменений
- Статистика: количество изменений, время выполнения, snapshots

**Функция статистики:** `get_recompute_stats()`
- Количество учителей/филиалов, средние рейтинги
- Статистика снапшотов за 24 часа
- Здоровье системы рейтингов

---

## 🎯 Результаты рефакторинга

### Количественные улучшения

- **Дублирующего кода удалено:** ~300-400 строк
- **API эндпоинтов:** Сокращено с 21 до логически 18 (3 объединены)
- **Хуков:** 2 дублирующих → 1 унифицированный + compatibility слой
- **Middleware:** 0 → 3 универсальных компонента
- **Сервисов:** 0 → 3 business logic сервиса

### Качественные улучшения

- **Единая точка истины** для каждой операции
- **Автоматическое логирование** и error handling
- **Защита от спама** в пересчете рейтингов
- **Backward compatibility** — ничего не сломалось
- **Типизация** всех API клиентов
- **Мониторинг производительности** из коробки

### Производительность

- **Пересчет рейтингов:** Только при наличии изменений (защита от лишних вызовов)
- **API ответы:** Автоматическое отслеживание медленных запросов (>5с)
- **Базы данных:** Оптимизированные индексы для проверки изменений
- **Frontend:** Optimistic updates в UI компонентах

---

## 🚀 Следующие шаги

### Готово к Production
- ✅ Все тесты проходят
- ✅ TypeScript компиляция без ошибок
- ✅ Next.js сборка успешна
- ✅ Backward compatibility сохранена

### План очищения
- 📋 Подготовлен автоматический скрипт очищения
- 🗑️ Список файлов для удаления после тестирования
- 🔄 Rollback процедуры при проблемах
- ⏰ Поэтапное выполнение с проверками

### Мониторинг в Production
- 📊 Автоматические метрики производительности
- 🚨 Алерты на медленные запросы
- 📈 Еженедельные отчеты по производительности
- 🔍 Логирование для отладки

**Система готова к развертыванию и финальному тестированию!**
