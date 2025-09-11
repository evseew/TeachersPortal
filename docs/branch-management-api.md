# Branch Management API

Обновленная документация по API управления филиалами после рефакторинга.

## Архитектура

### Слои архитектуры:
1. **API Routes** (`/api/system/branches`) - REST endpoints
2. **API Client** (`lib/api/system.ts`) - клиентские функции
3. **Business Logic** (`hooks/use-branch-management.tsx`) - бизнес-логика
4. **UI Components** (`app/system/configuration/page.tsx`) - пользовательский интерфейс

## API Endpoints

### GET /api/system/branches
Получить список всех филиалов.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string"
  }
]
```

### POST /api/system/branches
Создать новый филиал.

**Request:**
```json
{
  "name": "string" // обязательное, не пустое
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string"
}
```

### PATCH /api/system/branches/[id]
Обновить существующий филиал.

**Request:**
```json
{
  "name": "string" // обязательное, не пустое
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string"
}
```

### DELETE /api/system/branches/[id]
Удалить филиал.

**Response:**
```json
{
  "ok": true
}
```

### GET /api/system/branches/[id]/check-usage
Проверить использование филиала перед удалением.

**Response:**
```json
{
  "canDelete": boolean,
  "linkedRecords": {
    "profiles": number,
    "metrics": number,
    "profileDetails": [
      {
        "user_id": "uuid",
        "full_name": "string",
        "email": "string"
      }
    ]
  }
}
```

## Клиентские функции

### `listBranches(): Promise<Branch[]>`
Загружает список филиалов.

### `createBranch(name: string): Promise<Branch>`
Создает новый филиал с указанным названием.

### `updateBranch(id: string, name: string): Promise<Branch>`
Обновляет название филиала.

### `deleteBranch(id: string): Promise<void>`
Удаляет филиал.

### `checkBranchUsage(id: string): Promise<BranchUsageInfo>`
Проверяет связанные записи перед удалением.

## Хук useBranchManagement

### Состояние
```typescript
interface BranchManagementState {
  branches: Branch[]           // список филиалов
  loading: boolean            // загрузка данных
  error: string | null        // ошибка загрузки
  isSubmitting: boolean       // выполнение операции
  editingBranchId: string | null // ID редактируемого филиала
}
```

### Методы
- `loadBranches()` - загрузить список филиалов
- `createBranch(formData)` - создать филиал с валидацией
- `startEditing(branchId)` - начать редактирование
- `cancelEditing()` - отменить редактирование
- `updateBranch(branchId, formData)` - обновить филиал
- `deleteBranch(branchId)` - удалить филиал

### Особенности реализации

#### Optimistic Updates
Хук использует optimistic updates для лучшего UX:
- При создании временно добавляет филиал в список
- При обновлении сразу показывает новое название
- При ошибке откатывает изменения

#### Валидация
- **Пустое название**: отклоняется с уведомлением
- **Дублирование**: проверка уникальности названий (case-insensitive)
- **Длина**: максимум 100 символов
- **Trim**: автоматическое удаление пробелов

#### Error Handling
- Graceful fallback при ошибках API
- Информативные сообщения об ошибках
- Автоматический откат optimistic updates

## UI Компоненты

### BranchDeleteConfirmation
Диалог подтверждения удаления с проверкой связанных записей.

**Особенности:**
- Автоматическая проверка связанных преподавателей и метрик
- Визуальные индикаторы количества связанных записей
- Предупреждения о последствиях удаления
- Показ затронутых преподавателей

### Branch Management Table
Таблица управления филиалами с inline редактированием.

**Возможности:**
- Inline редактирование по клику на кнопку "Edit"
- Сохранение по Enter, отмена по Escape
- Loading states для всех операций
- Блокировка операций во время выполнения других операций

## Улучшения после рефакторинга

### ✅ Исправлены проблемы:
1. **Логика редактирования** - убран хак с `(startEditing as any)._id`
2. **Дублирование запросов** - optimistic updates вместо двойных вызовов API
3. **Валидация** - добавлена проверка уникальности и длины
4. **UX** - loading states, disabled states, keyboard shortcuts

### ✅ Новые возможности:
1. **Проверка связанных записей** перед удалением
2. **Optimistic updates** для мгновенного отклика
3. **Улучшенная валидация** с информативными сообщениями
4. **Keyboard navigation** (Enter для сохранения, Escape для отмены)

### ✅ Архитектурные улучшения:
1. **Separation of concerns** - логика вынесена в отдельный хук
2. **Reusable components** - компонент подтверждения удаления
3. **Type safety** - строгая типизация TypeScript
4. **Error boundaries** - graceful error handling

## Тестирование

### Unit тесты
Файл: `tests/branch-management.test.ts`

Покрывают:
- Валидацию форм
- Логику проверки дубликатов
- Обработку ошибок API
- Контрактное тестирование

### Contract тесты
Экспортированные функции для E2E тестирования API контрактов.

## Совместимость

Рефакторинг полностью совместим с существующей системой:
- API endpoints остались без изменений
- База данных не изменялась
- Существующие интеграции продолжают работать

## Производительность

### Оптимизации:
- **Optimistic updates** - мгновенный отклик UI
- **Lazy loading** - динамический импорт API функций
- **Debounced validation** - проверка уникальности только при необходимости
- **Minimal re-renders** - оптимизированное управление состоянием
