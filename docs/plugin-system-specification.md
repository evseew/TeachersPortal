# ТЗ: Система плагинов и интеграция с Pyrus

**Дата создания:** 22 сентября 2025  
**Версия:** 1.0  
**Статус:** Готово к реализации

## 🚀 КАК РАБОТАТЬ С ЭТИМ ТЗ

### Для ИИ разработчика:
1. **Читай только нужный этап** - каждый этап автономен
2. **Проверяй статус выполнения** - в разделе "Прогресс этапов" 
3. **Обновляй статус** после завершения - меняй ❌ на ✅
4. **Читай "Контекст проекта"** - там вся нужная информация
5. **Следуй чек-листу** в конце каждого этапа

### Формат работы:
```
Пользователь: "Выполни этап 3"
ИИ: 
1. Читает этап 3
2. Проверяет, что этапы 1-2 выполнены (статус ✅)
3. Выполняет все задачи этапа 3
4. Обновляет статус этапа 3: ❌ → ✅
5. Обновляет чек-лист выполненных задач
```

---

## 📊 ПРОГРЕСС ЭТАПОВ

| Этап | Название | Статус | Дата |
|------|----------|--------|------|
| 1 | Создание ядра системы плагинов | ❌ | - |
| 2 | Модульная архитектура Pyrus клиентов | ❌ | - |
| 3 | Создание плагина September Rating | ❌ | - |
| 4 | Автоматическая синхронизация | ❌ | - |
| 5 | Интеграция и тестирование | ❌ | - |
| 6 | Очистка и документация | ❌ | - |

**Инструкция по обновлению:** После завершения этапа замени ❌ на ✅ и укажи дату

---

## 📋 КОНТЕКСТ ПРОЕКТА

### Цель проекта
Создание системы плагинов для изоляции ядра портала от дополнительной функциональности с первым плагином "September Rating", который автоматически синхронизирует данные из Pyrus вместо ручного ввода KPI.

### Текущее состояние проекта
- **Портал:** Next.js + TypeScript + Supabase
- **Аутентификация:** NextAuth с Google OAuth (@planetenglish.ru)
- **Роли:** Administrator, Senior Teacher, Teacher, Salesman, Head of Sales, Regular User
- **БД:** Таблицы `teacher_metrics`, `current_scores`, `profiles`, `branch`
- **Существующий Pyrus клиент:** `lib/pyrus/client.ts` (базовый)
- **Сентябрьский рейтинг:** Полностью реализован в `app/september-rating/` и `components/dashboard/`

### Ключевые файлы проекта
- `middleware.ts` - проверка доступа к маршрутам
- `lib/auth/permissions.ts` - система разрешений
- `lib/clients/leaderboard.client.ts` - API клиенты
- `docs/teacher_exclusions.json` - исключения преподавателей
- `docs/reference.md` - логика группировки из Pyrus (35+, 16-34, 6-15)

### 🚨 КРИТИЧЕСКИ ВАЖНЫЕ ДЕТАЛИ

**1. Логика филиалов для рейтинга:**
- **Рейтинг преподавателей:** НЕ привязан к филиалу (`teacher_metrics.branch_id = NULL`)
- **Рейтинг филиалов:** Группировка по филиалу ИЗ ФОРМ Pyrus, НЕ из `profiles.branch_id`
- **Принцип:** Игнорируем основной филиал портала, используем только данные форм

**2. Система групп преподавателей (из reference.md):**
- **Старички (2304918):** 35+, 16-34, 6-15 студентов
- **Trial (792300):** 16+, 11-15, 5-10 БПЗ студентов
- **Призы:** iPad (1 место в топ группах), HonorPad, Подписка в Tg Premium
- **Эмодзи:** 🥇🥈🥉

**3. Исключения преподавателей:**
- НЕ показываются в рейтинге преподавателей (фильтрация при отображении)
- НО учитываются в рейтинге филиалов (записываем всех в БД)
- Источник: `docs/teacher_exclusions.json`

**4. Mapping данных Pyrus → БД:**
- `form_2304918_total` → `last_year_base`
- `form_2304918_studying` → `last_year_returned`
- `form_792300_total` → `trial_total` 
- `form_792300_studying` → `trial_converted`

## Архитектурные решения

### Система плагинов
- **Тип загрузки**: Статическая регистрация (build-time)
- **Структура**: Плагины в папке `plugins/` в корне проекта
- **Авторизация**: Базовая проверка + дополнительные ограничения плагинов
- **Настройки**: Конфигурационные файлы (только чтение)
- **API**: Плагины могут создавать собственные endpoints
- **Роутинг**: Экспорт компонентов + импорт в `app/` страницы

### Интеграция с Pyrus
- **Частота синхронизации**: Автоматически каждый час
- **Источник данных**: Формы 2304918 (старички) и 792300 (trial)
- **Хранение**: Существующие таблицы (`teacher_metrics`, `current_scores`)
- **Исключения**: Записываем всех, фильтруем при отображении

---

## ЭТАП 1: Создание ядра системы плагинов
**Цель:** Базовая инфраструктура для плагинов  
**Время:** 1-2 дня

### Задачи

#### 1.1. Создать типы и интерфейсы плагинов
**Файл:** `plugins/core/plugin-types.ts`
```typescript
export interface PluginConfig {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  permissions: UserRole[]
  routes: string[]
  apiRoutes?: string[]
}

export interface PluginRegistry {
  [pluginId: string]: PluginConfig
}
```

#### 1.2. Создать реестр плагинов
**Файл:** `plugins/registry.ts`
```typescript
import { PluginRegistry } from './core/plugin-types'

export const pluginRegistry: PluginRegistry = {
  // Плагины будут регистрироваться здесь
}
```

#### 1.3. Расширить систему авторизации
**Файл:** `lib/auth/plugin-permissions.ts`
- Функция `hasPluginAccess(userRole, pluginId, context)`
- Интеграция с существующим `hasAccess()`

#### 1.4. Создать хуки для работы с плагинами
**Файл:** `hooks/use-plugins.ts`
- `useAvailablePlugins(userRole)` - список доступных плагинов
- `usePluginConfig(pluginId)` - конфигурация плагина

### ✅ ЧЕК-ЛИСТ ЭТАПА 1
**Обязательно обновляй после выполнения каждой задачи:**

- [ ] 1.1. Файл `plugins/core/plugin-types.ts` создан с интерфейсами
- [ ] 1.2. Файл `plugins/registry.ts` создан с пустым реестром
- [ ] 1.3. Файл `lib/auth/plugin-permissions.ts` создан с функциями
- [ ] 1.4. Файл `hooks/use-plugins.ts` создан с хуками
- [ ] Все файлы компилируются без ошибок TypeScript
- [ ] Можно импортировать типы из `plugins/core/plugin-types.ts`
- [ ] Тестовый плагин можно добавить в реестр

**После выполнения всех задач:**
1. Обнови статус этапа 1 в таблице "Прогресс этапов": ❌ → ✅
2. Укажи дату завершения

---

## ЭТАП 2: Модульная архитектура Pyrus клиентов
**Цель:** Создать масштабируемую систему для работы с Pyrus API  
**Время:** 1-2 дня

### Задачи

#### 2.1. Создать базовый Pyrus клиент
**Файл:** `lib/pyrus/base-client.ts`
- Перенести авторизацию из существующего `client.ts`
- Базовые HTTP методы (`makeRequest`, `authenticate`)
- Общие утилиты (обработка ошибок, retry логика)

#### 2.2. Создать клиент для работы с формами
**Файл:** `lib/pyrus/forms-client.ts`
```typescript
export class PyrusFormsClient extends PyrusBaseClient {
  async *iterRegisterTasks(formId: number): AsyncGenerator<PyrusTask>
  private getFieldValue(fieldList: any[], fieldId: number): any
}
```

#### 2.3. Создать клиент для работы с преподавателями  
**Файл:** `lib/pyrus/teachers-client.ts`
```typescript  
export class PyrusTeachersClient extends PyrusBaseClient {
  extractTeacherName(taskFields: any[], fieldId: number): string
  extractBranchName(taskFields: any[], fieldId: number): string
  isStudying(taskFields: any[], fieldId: number): boolean
  isValidPEStatus(taskFields: any[], fieldId: number): boolean
}
```

#### 2.4. Создать фабрику клиентов
**Файл:** `lib/pyrus/client-factory.ts`
```typescript
export class PyrusClientFactory {
  static createFormsClient(): PyrusFormsClient
  static createTeachersClient(): PyrusTeachersClient  
  static createUsersClient(): PyrusUsersClient // существующий
}
```

#### 2.5. Создать сервис синхронизации
**Файл:** `lib/services/pyrus-sync.service.ts`
```typescript
export class PyrusSyncService {
  constructor(
    private formsClient: PyrusFormsClient,
    private teachersClient: PyrusTeachersClient
  ) {}
  
  async syncForm2304918(): Promise<TeacherMetrics[]>
  async syncForm792300(): Promise<TeacherMetrics[]>
  private applyTeacherExclusions(data: any[]): any[]
  private updateTeacherMetrics(metrics: TeacherMetrics[]): Promise<void>
  private groupDataByBranch(data: any[]): BranchMetrics[] // Группировка по филиалу ИЗ ФОРМ
}
```

#### 2.6. Загрузить исключения преподавателей
**Файл:** `lib/constants/teacher-exclusions.ts`
- Импорт данных из `docs/teacher_exclusions.json`
- Функции проверки исключений по типам форм

### ✅ ЧЕК-ЛИСТ ЭТАПА 2
**Проверь, что этап 1 выполнен (статус ✅) перед началом!**

- [ ] 2.1. Файл `lib/pyrus/base-client.ts` создан (авторизация из старого клиента)
- [ ] 2.2. Файл `lib/pyrus/forms-client.ts` создан с методами из reference.md
- [ ] 2.3. Файл `lib/pyrus/teachers-client.ts` создан с извлечением данных
- [ ] 2.4. Файл `lib/pyrus/client-factory.ts` создан с фабрикой
- [ ] 2.5. Файл `lib/services/pyrus-sync.service.ts` создан с синхронизацией
- [ ] 2.6. Файл `lib/constants/teacher-exclusions.ts` создан с исключениями
- [ ] Все клиенты наследуются от базового
- [ ] Фабрика корректно создает экземпляры клиентов
- [ ] Тестовая авторизация через базовый клиент работает

**После выполнения всех задач:**
1. Обнови статус этапа 2: ❌ → ✅
2. Укажи дату завершения

---

## ЭТАП 3: Создание плагина September Rating
**Цель:** Первый рабочий плагин с автоматической синхронизацией  
**Время:** 2-3 дня

### Задачи

#### 3.1. Создать структуру плагина
```
plugins/september-rating/
├── plugin.config.ts      # Конфигурация плагина
├── rules/
│   └── selection-rules.json  # Правила выборки данных
├── components/
│   ├── main-page.tsx     # Главная страница с победителями
│   ├── teacher-leaderboard.tsx
│   ├── branch-leaderboard.tsx
│   └── rules-display.tsx # Компонент отображения правил
├── pages/
│   └── rules-page.tsx    # Страница с правилами для пользователей
├── api/
│   └── sync.ts          # API для синхронизации
├── services/
│   └── pyrus-adapter.ts  # Адаптер для работы с Pyrus
└── index.ts             # Экспорты плагина
```

#### 3.2. Настроить конфигурацию плагина
**Файл:** `plugins/september-rating/plugin.config.ts`
```typescript
export const config: PluginConfig = {
  id: 'september-rating',
  name: 'September Rating',
  version: '1.0.0',
  description: 'Рейтинги и лидерборды за сентябрь 2024',
  enabled: true,
  permissions: ['Administrator', 'Senior Teacher', 'Teacher', 'Salesman', 'Head of Sales'],
  routes: ['/september-rating', '/september-rating/*'],
  apiRoutes: ['/api/plugins/september-rating/*']
}
```

#### 3.3. Создать правила выборки данных
**Файл:** `plugins/september-rating/rules/selection-rules.json`
```json
{
  "name": "Сентябрьский рейтинг из Pyrus",
  "description": "Правила отбора преподавателей для рейтинга за сентябрь 2024",
  "updated": "2025-09-22",
  "author": "Администратор",
  
  "forms": {
    "form_2304918": {
      "name": "Возврат студентов (старички)",
      "filters": [
        {
          "field": "status_pe",
          "condition": "включить",
          "values": ["PE Start", "PE Future", "PE 5"],
          "description": "Только активные статусы PE"
        },
        {
          "field": "branch",
          "condition": "исключить",
          "values": ["Макеева 15", "Коммуны 106/1"],
          "description": "Исключаем закрытые филиалы"
        }
      ]
    },
    "form_792300": {
      "name": "Конверсия trial студентов",
      "filters": [
        {
          "field": "status_pe",
          "condition": "включить",
          "values": ["PE Start", "PE Future", "PE 5"],
          "description": "Только активные статусы PE"
        }
      ]
    }
  },
  
  "teacher_exclusions": {
    "oldies": {
      "teachers": ["Валеев", "Якупова", "Булаева", "Пасечникова"],
      "reason": "Исключены из рейтинга по старичкам по решению руководства"
    },
    "trial": {
      "teachers": ["Ремпович"],
      "reason": "Исключен из рейтинга по trial по решению руководства"
    }
  },
  
  "calculations": {
    "return_percentage": "Процент возврата = (Учащиеся старички / Всего старичков) × 100",
    "conversion_percentage": "Процент конверсии = (Учащиеся trial / Всего trial) × 100",
    "total_score": "Общий балл = Процент возврата + Процент конверсии"
  },
  
  "teacher_groups": {
    "oldies": {
      "description": "Группировка по количеству студентов (форма 2304918)",
      "groups": {
        "35+": {
          "emoji": "🥇",
          "prizes": ["iPad", "HonorPad", "HonorPad", "HonorPad"],
          "winners_count": 4
        },
        "16-34": {
          "emoji": "🥈", 
          "prize": "HonorPad",
          "winners_count": 3
        },
        "6-15": {
          "emoji": "🥉",
          "prize": "Подписка в Tg Premium",
          "winners_count": 3
        }
      },
      "sorting": "По % возврата, при равенстве - по количеству студентов"
    },
    "trial": {
      "description": "Группировка по количеству БПЗ студентов (форма 792300)",
      "groups": {
        "16+": {
          "emoji": "🥇",
          "prizes": ["iPad", "HonorPad", "HonorPad", "HonorPad"], 
          "winners_count": 4
        },
        "11-15": {
          "emoji": "🥈",
          "prize": "HonorPad",
          "winners_count": 3
        },
        "5-10": {
          "emoji": "🥉",
          "prize": "Подписка в Tg Premium",
          "winners_count": 3
        }
      },
      "sorting": "По % конверсии, при равенстве - по количеству БПЗ студентов"
    }
  }
}
```

#### 3.4. Мигрировать существующие компоненты

**Страницы для переноса:**
- `app/september-rating/page.tsx` → `plugins/september-rating/pages/main-page.tsx`
  - Hero секция с градиентом и Trophy иконкой
  - Интеграция с BranchLeaderboard и TeacherLeaderboard
  - Параметр `showOnlyCards={true}`

- `app/september-rating/teacher-leaderboard/page.tsx` → `plugins/september-rating/pages/teacher-leaderboard-page.tsx`
- `app/september-rating/branch-leaderboard/page.tsx` → `plugins/september-rating/pages/branch-leaderboard-page.tsx`

**Компоненты для переноса:**
- `components/dashboard/teacher-leaderboard.tsx` → `plugins/september-rating/components/teacher-leaderboard.tsx`
  - **ВАЖНО: Переделать под систему групп из reference.md**
  - Группировка по количеству студентов: 35+, 16-34, 6-15 (для старичков)
  - Группировка по количеству БПЗ: 16+, 11-15, 5-10 (для trial)
  - Эмодзи группы: 🥇🥈🥉
  - Призы по группам: iPad, HonorPad, Подписка в Tg Premium
  - Сортировка внутри групп по % (возврата/конверсии)
  - Поиск и фильтрация по имени, филиалу, категории
  - Дельты изменений с цветными стрелками
  - API интеграция с `fetchTeacherLeaderboard`

- `components/dashboard/branch-leaderboard.tsx` → `plugins/september-rating/components/branch-leaderboard.tsx`
  - Иконки рангов с градиентами (золото/серебро/бронза)
  - Анимированные sparkles для 1 места
  - Призы для топ-5: Interactive Display, кофемашина, деньги
  - Поиск по названию филиала
  - API интеграция с `fetchBranchLeaderboard`

**Важно сохранить:**
- Все UI/UX элементы (градиенты, анимации, иконки)
- API интеграции с существующими endpoints
- Цветовые схемы и брендинг
- Функциональность поиска и фильтрации
- Пагинацию и переключение видов

#### 3.5. Создать компонент отображения правил
**Файл:** `plugins/september-rating/components/rules-display.tsx`
- Красивое отображение правил из JSON файла
- Карточки с фильтрами и исключениями
- Объяснение расчетов для пользователей

**Файл:** `plugins/september-rating/pages/rules-page.tsx`
- Страница `/september-rating/rules` 
- Доступна всем пользователям плагина
- Полная прозрачность правил выборки

#### 3.6. Создать адаптер плагина для Pyrus
**Файл:** `plugins/september-rating/services/pyrus-adapter.ts`
```typescript
import selectionRules from '../rules/selection-rules.json'

export class SeptemberRatingPyrusAdapter {
  constructor(private syncService: PyrusSyncService) {}
  
  private getRules() {
    return selectionRules // Используем правила из JSON
  }
  
  async syncSeptemberData(): Promise<SyncResult>
  private mapPyrusDataToMetrics(data: any[]): TeacherMetrics[]
  private handleExclusions(data: any[]): any[]
}
```

#### 3.7. Создать API синхронизации
**Файл:** `plugins/september-rating/api/sync.ts`
- Endpoint для запуска синхронизации
- Использует адаптер плагина
- Обновление `teacher_metrics` таблицы

### ✅ ЧЕК-ЛИСТ ЭТАПА 3
**Проверь, что этапы 1-2 выполнены (статус ✅) перед началом!**

- [ ] 3.1. Структура папок плагина создана
- [ ] 3.2. Файл `plugin.config.ts` создан с правильными настройками
- [ ] 3.3. Файл `rules/selection-rules.json` создан с группами и призами
- [ ] 3.4. Компоненты перенесены из `app/september-rating/` и `components/dashboard/`
- [ ] 3.5. Компонент `rules-display.tsx` создан для отображения правил
- [ ] 3.6. Страница `rules-page.tsx` создана для пользователей
- [ ] 3.7. Адаптер `pyrus-adapter.ts` создан с импортом правил из JSON
- [ ] 3.8. API `sync.ts` создан для синхронизации
- [ ] Teacher Leaderboard переделан под систему групп (35+, 16-34, 6-15)
- [ ] Плагин зарегистрирован в `plugins/registry.ts`
- [ ] Все компоненты работают с новой структурой

**После выполнения всех задач:**
1. Обнови статус этапа 3: ❌ → ✅
2. Укажи дату завершения

---

## ЭТАП 4: Автоматическая синхронизация
**Цель:** Настроить автоматическое обновление данных каждый час  
**Время:** 1 день

### Задачи

#### 4.1. Создать cron job
**Файл:** `app/api/cron/pyrus-sync/route.ts`
- Endpoint для планировщика Vercel
- Вызов синхронизации плагина
- Логирование результатов

#### 4.2. Настроить Vercel Cron
**Файл:** `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/pyrus-sync",
    "schedule": "0 * * * *"
  }]
}
```

#### 4.3. Обработка ошибок и мониторинг
- Уведомления об ошибках синхронизации
- Логи выполнения в консоль
- Graceful handling сбоев Pyrus API

### Критерии готовности
- [ ] Cron job настроен
- [ ] Синхронизация запускается каждый час
- [ ] Ошибки обрабатываются корректно
- [ ] Данные обновляются автоматически

---

## ЭТАП 5: Интеграция и тестирование
**Цель:** Полная интеграция плагина в портал  
**Время:** 1-2 дня

### Задачи

#### 5.1. Обновить роутинг
- Обновить `app/september-rating/page.tsx` для использования плагина
- Обновить навигацию и меню
- Проверить все ссылки

#### 5.2. Обновить middleware
**Файл:** `middleware.ts`
- Добавить проверки доступа к плагинам
- Интегрировать с `hasPluginAccess()`

#### 5.3. Добавить страницу с правилами в роутинг
**Файл:** `app/september-rating/rules/page.tsx`
- Импорт страницы правил из плагина
- Доступность по URL `/september-rating/rules`

#### 5.4. Фильтрация исключенных преподавателей
**Файл:** `components/dashboard/teacher-leaderboard.tsx`
- Добавить фильтрацию при отображении
- Исключенные не показываются в лидерборде
- Данные для филиалов остаются полными

#### 5.5. Тестирование
- Проверить все существующие функции
- Тестировать синхронизацию с тестовыми данными
- Проверить права доступа для разных ролей

### Критерии готовности
- [ ] Плагин полностью интегрирован
- [ ] Страница с правилами добавлена в роутинг
- [ ] Все существующие функции работают
- [ ] Исключения преподавателей применяются
- [ ] Синхронизация с Pyrus работает стабильно

---

## ЭТАП 6: Очистка и документация
**Цель:** Финализация и подготовка к продакшену  
**Время:** 1 день

### Задачи

#### 6.1. Удалить старый код
- Удалить неиспользуемые файлы из `app/september-rating/`
- Очистить неиспользуемые импорты
- Обновить зависимости

#### 6.2. Обновить документацию
- Добавить описание системы плагинов в README
- Документировать API плагинов
- Создать guide по созданию новых плагинов

#### 6.3. Финальное тестирование
- End-to-end тестирование всех функций
- Проверка производительности
- Тестирование на продакшене

### Критерии готовности
- [ ] Старый код удален
- [ ] Документация обновлена
- [ ] Финальное тестирование пройдено
- [ ] Готово к релизу

---

## Технические детали

### Структура файлов после реализации
```
plugins/
├── core/
│   ├── plugin-types.ts
│   ├── plugin-loader.ts
│   └── plugin-permissions.ts
├── september-rating/
│   ├── plugin.config.ts
│   ├── components/
│   ├── api/
│   ├── services/
│   │   └── pyrus-adapter.ts
│   └── index.ts
└── registry.ts

lib/
├── pyrus/
│   ├── base-client.ts (новый)
│   ├── forms-client.ts (новый)
│   ├── teachers-client.ts (новый)
│   ├── client-factory.ts (новый)
│   └── client.ts (существующий PyrusUsersClient)
└── services/
    └── pyrus-sync.service.ts (новый)

app/api/cron/
└── pyrus-sync/
    └── route.ts
```

### Переменные окружения
```
PYRUS_LOGIN=your_login
PYRUS_SECURITY_KEY=your_key
PYRUS_API_URL=https://api.pyrus.com/v4/
```

### Mapping данных Pyrus → teacher_metrics
- `form_2304918_total` → `last_year_base`
- `form_2304918_studying` → `last_year_returned` 
- `form_792300_total` → `trial_total`
- `form_792300_studying` → `trial_converted`

**ВАЖНО: Логика филиалов для рейтинга**
- **Рейтинг преподавателей:** НЕ привязан к филиалу (`teacher_metrics.branch_id = NULL`)
- **Рейтинг филиалов:** Группировка по филиалу ИЗ ФОРМ Pyrus, НЕ из `profiles.branch_id`
- **Принцип:** Игнорируем основной филиал портала, используем только данные форм

### Исключения преподавателей
- Источник: `docs/teacher_exclusions.json`
- Применение: при отображении лидерборда (фильтрация)
- Филиалы: учитывают всех преподавателей (включая исключенных)

---

## Система прозрачных правил интеграций

### Принцип работы:
1. **Правила в JSON** - каждый плагин имеет файл `rules/selection-rules.json`
2. **Отображение пользователям** - страница `/[plugin]/rules` показывает все правила
3. **Использование в коде** - адаптеры импортируют правила из JSON
4. **Версионность** - правила версионируются через Git

### Структура правил:
- **Формы и фильтры** - какие данные берем
- **Исключения** - кого не учитываем  
- **Расчеты** - как считаем показатели
- **Метаданные** - автор, дата, описание

### Для будущих плагинов:
Каждый новый плагин с внешними интеграциями должен иметь:
- `rules/selection-rules.json` - правила выборки
- `components/rules-display.tsx` - компонент отображения
- `pages/rules-page.tsx` - страница для пользователей

---

## Инструкции для ИИ разработчиков

### При работе над каждым этапом:

1. **Читать весь этап полностью** перед началом работы
2. **Проверить предыдущие этапы** - что уже сделано
3. **Следовать структуре файлов** точно как указано
4. **Создавать правила выборки** в JSON для каждой интеграции
5. **Тестировать каждую функцию** после создания
6. **Сохранять существующий функционал** - ничего не ломать
7. **Использовать TypeScript** для всех новых файлов
8. **Следовать существующим паттернам** кода в проекте

### Перед завершением этапа:
- [ ] Все задачи выполнены
- [ ] Код протестирован
- [ ] Существующая функциональность не сломана
- [ ] Критерии готовности выполнены

### В случае проблем:
1. Проверить существующий код в проекте
2. Следовать паттернам из `lib/`, `components/`, `app/`
3. Использовать существующие хуки и сервисы
4. При сомнениях - сохранить совместимость с текущим кодом

---

---

## 📝 ЖУРНАЛ ИЗМЕНЕНИЙ ТЗ

### Версия 1.0 (22 сентября 2025)
- Создана базовая версия ТЗ
- Добавлена система прогресса этапов
- Добавлены детальные чек-листы для каждого этапа
- Добавлен раздел критически важных деталей

### Как вносить изменения:
1. **При изменении требований:** обнови соответствующий этап + увеличь версию
2. **При обнаружении ошибок:** исправь + добавь запись в журнал
3. **При добавлении деталей:** обнови раздел "Критически важные детали"

### Шаблон записи:
```
### Версия X.X (дата)
- Что изменено
- Причина изменения
- Какие этапы затронуты
```

---

**Готово к реализации!** 🚀

### 🎯 Быстрый старт для ИИ:
1. Прочитай "Контекст проекта" и "Критически важные детали"
2. Найди нужный этап по номеру
3. Проверь статус предыдущих этапов
4. Выполни все задачи из чек-листа
5. Обнови статус этапа в таблице прогресса
