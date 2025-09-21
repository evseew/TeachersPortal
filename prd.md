PRD v1 — «PlanetEnglish Portal / September Rating»

0) Обзор и цели

Цель v1: запустить рабочий модуль «September Rating» с лидербордами филиалов и преподавателей, массовым вводом KPI старшими, стрелками динамики (от последнего снапшота), базовой админкой System для пользователей/ролей/филиалов.
Источник истины по UI: твой дизайн (VZero). Мы «подключаем логику» к этому UI.

Вне объёма v1 (перенос на уровень 2)
	•	Несколько филиалов у одного преподавателя.
	•	Dark Mode/Theme Customizer (переключатель может остаться, но как «nice to have»).
	•	Любые доп.модули кроме September Rating (кроме заглушки Newcomers).
	•	Ручная регистрация (кнопка остаётся, логики нет).
	•	Наградная механика для преподавателей (пока только колонка Placeholder Prize в таблице; у филиалов призы есть, как в дизайне).

⸻

1) Роли и категории (как в дизайне)

Роли (RBAC, 5 штук)
	•	Administrator — доступ: September Rating, Mass KPI Input, System (Users/Settings/Configuration). Полные права.
	•	Senior Teacher — доступ: September Rating, Mass KPI Input (ввод KPI).
	•	Teacher (роль по умолчанию при первом входе) — доступ: September Rating, видит только себя в профиле.
	•	Salesman — доступ: September Rating (read-only).
	•	Head of Sales — доступ: September Rating, System (read на Users/Configuration).

Админ вручную назначает роли в System → Users.

Категории преподавателей (обязательное поле)
	•	Partner, Senior, Middle, Junior, Newcomer
Категория отображается в карточках/таблицах и фильтрах.

Админ вручную назначает категорию в профиле пользователя или в System → Users.

⸻

2) Разделы и страницы (как в дизайне)
	•	Sidebar:
	•	Dashboard (может быть пустым)
	•	September Rating
	•	/september-rating (сводная)
	•	/september-rating/branch-leaderboard
	•	/september-rating/teacher-leaderboard
	•	Mass KPI Input
	•	/mass-kpi-input
	•	/mass-kpi-input/september-rating
	•	Newcomers Rating — /newcomers-rating (заглушка «Скоро»)
	•	System — /system
	•	/system/users (управление пользователями: роль, филиал, категория)
	•	/system/configuration (филиалы + матрица прав ролей)
	•	/system/settings (заглушка)

⸻

3) Сущности и данные (минимум для v1)

Профиль пользователя
	•	user_id, email, role (Teacher by default), branch_id (один для v1), category (из списка), full_name, avatar_url.
	•	Создаётся автоматически при первом входе через Google Workspace домена @planetenglish.ru.
	•	Админ вручную назначает role, branch_id, category.

Филиал (Branch)
	•	id, name.
	•	Создаётся вручную админом в System → Configuration.

KPI по преподавателю (v1 «один филиал на преподавателя»)
	•	Для каждого преподавателя:
	•	last_year_base, last_year_returned → вычисляется return_pct.
	•	trial_total, trial_converted → trial_pct.
	•	score = coalesce(return_pct,0) + coalesce(trial_pct,0).
	•	updated_at, updated_by.
	•	Вводятся массово старшими на странице Mass KPI Input.

Снимки и дельты (snapshots)
	•	Таблица snapshots хранит последние зафиксированные значения для контекстов:
	•	teacher_overall (в v1 фактически = по одному филиалу), контекст all;
	•	branch_overall, контекст all.
	•	При каждом успешном сохранении KPI: пересчитываем рейтинги, считаем delta_rank, delta_score от последнего снимка; при изменении — пишем новый снимок.
	•	Фронт уже рисует стрелки (ArrowUp/Down) — просто подставляем delta_rank, delta_score.

Призы (как в дизайне)
	•	Для филиалов — топ-5 карточек с призами (иконки).
	•	Для преподавателей — колонка Prize (placeholder, значения можно подставлять позже).

⸻

4) API-контракты (read через VIEW, write через RPC)

Read (только VIEW api_v1.*)
	•	GET /api/leaderboard?type=branch_overall → поля: branch_id, branch_name, score, rank, delta_rank, delta_score, updated_at, prize?.
	•	GET /api/leaderboard?type=teacher_overall → поля: teacher_id, name (Иванова Мария П.), branch_id, branch_name, category, return_pct, trial_pct, score, rank, delta_rank, delta_score, updated_at, prize?.

Write (только RPC)
	•	POST /api/metrics/batch-upsert
	•	тело: массив строк { teacher_id, last_year_base, last_year_returned, trial_total, trial_converted } + editorEmail.
	•	эффект: upsert KPI → recompute_current_scores() → обновление current_scores → пересчёт дельт → запись snapshots по изменившимся строкам.

Auth
	•	NextAuth Google: разрешаем вход только @planetenglish.ru; при событии signIn → ensure_profile(email, avatar).

⸻

5) Пошаговый план для Cursor (выполнять по порядку)

Шаг 1. Auth + автопрофили

Цель: вход только по домену, автосоздание профиля, аватар/имя из Google.
	•	Подключить NextAuth с Google (Redirect URI для текущего домена).
	•	Колбэк signIn — пускать только @planetenglish.ru.
	•	Событие events.signIn → RPC ensure_profile(email, avatar_url).
	•	UI: страница Login — кнопка «Sign in with Google» активна; кнопка «Register manually» остаётся как заглушка.
Тесты (E2E):
	•	Логин с @planetenglish.ru → профиль создан, роль=Teacher, филиал/категория пустые.
	•	Логин с внешней почтой → отказ.

Шаг 2. System → Configuration (филиалы и матрица ролей)

Цель: админ вручную создаёт филиалы; матрица прав — как в дизайне.
	•	Таблица branch + UI на /system/configuration.
	•	Таблица role_permissions (можно хранить в JSON или в конфиг-вьюхе); UI — уже есть, связать с данными.
Тесты:
	•	Создание/редактирование/удаление филиала доступно только админу.
	•	Матрица ролей доступна admin/HoS (read) как в дизайне.

Шаг 3. System → Users (назначение роли/филиала/категории)

Цель: админ назначает пользователю роль, филиал, категорию.
	•	/system/users подключить к БД (пока без импорта).
	•	Роли: 5 фиксированных; Категории: Partner/Senior/Middle/Junior/Newcomer.
Тесты:
	•	Admin меняет роль/филиал/категорию → изменения видны на /profile и в лидербордах (категория).

Шаг 4. KPI-модель + RPC batch-upsert

Цель: хранить KPI и принимать массовые апдейты.
	•	Таблица teacher_metrics (v1: один филиал на преподавателя) с generated return_pct, trial_pct, score.
	•	RPC metrics_batch_upsert(rows, editor) — сравнивает/обновляет только изменившиеся поля; вызывает recompute_current_scores().
Тесты (unit SQL/Vitest):
	•	Загрузка пачки KPI → значения, проценты и score пересчитались корректно.
	•	Повторный пост тех же данных не меняет версию/обновления (idempotent).

Шаг 5. Пересчёт рейтингов + snapshots

Цель: актуализировать рейтинги и стрелки.
	•	Функция recompute_current_scores():
	•	Teacher overall: rank по score (dense_rank).
	•	Branch overall: взвешенный по весу last_year_base + trial_total.
	•	Пишет/обновляет current_scores.
	•	Сравнивает с последним snapshot → delta_rank, delta_score; если есть изменения — вставляет новый снимок.
Тесты:
	•	После batch-upsert меняются rank/delta_* ожидаемо.
	•	Вставка снапшота происходит только при изменениях.

Шаг 6. Read API через VIEW (api_v1.*)

Цель: фронт читает только стабильные вьюхи.
	•	Создать api_v1.vw_leaderboard_branch_overall_all, api_v1.vw_leaderboard_teacher_overall_all (+ при необходимости вьюху для таблицы).
	•	Обновить /api/leaderboard на чтение этих VIEW.
Тесты (contract):
	•	GET /api/leaderboard?type=branch_overall возвращает упорядоченный список с delta_*.
	•	GET /api/leaderboard?type=teacher_overall — список с category, branch_name, delta_*.

Шаг 7. Подключить UI к API (September Rating)

Цель: карточки/таблицы используют реальные данные.
	•	BranchLeaderboard: наполняется из /api/leaderboard?type=branch_overall; призы — по месту 1–5 (иконки/названия как в дизайне).
	•	TeacherLeaderboard: наполняется из /api/leaderboard?type=teacher_overall; колонка Prize остаётся placeholder.
	•	Стрелки: использовать delta_rank/delta_score (не добавляя новых колонок).
Тесты (Playwright):
	•	Отрисовка карточек ТОП-5 филиалов с призами и стрелками.
	•	Сортировка по rank и фильтры по категории/филиалу работают.

Шаг 8. Mass KPI Input — связать с RPC

Цель: массовый ввод работает по-настоящему.
	•	На blur/изменении полей отправлять батчи на /api/metrics/batch-upsert (debounce).
	•	После успеха — «Saved» и автоматическое обновление локального списка (опционально refetch).
Тесты:
	•	Изменение цифр → score и rank меняются на лидербордах; появляются дельты/стрелки.

Шаг 9. Профиль /profile

Цель: профиль показывает данные из БД и аватар Google.
	•	При первом входе: full_name, avatar_url из Google; роль=Teacher.
	•	После назначения админом: показывать branch, category.
Тесты:
	•	У учителя роль/категория корректно отображаются; доступы соответствуют роли.

Шаг 10. RBAC на маршрутах и UI

Цель: страницы доступны строго по ролям.
	•	Middleware/guard на страницах:
	•	Teacher/Salesman: только September Rating.
	•	Senior Teacher: + Mass KPI Input.
	•	Head of Sales: + System (read).
	•	Admin: полный доступ.
Тесты (Playwright):
	•	Пользователь каждой роли не видит запрещённые разделы; прямой переход по URL редиректит/403.

Шаг 11. Newcomers Rating (заглушка)

Цель: страница существует, кликабельна, но без логики.
	•	/newcomers-rating: «В разработке», краткий текст что это будет.
Тест:
	•	Страница открывается, возвращает 200, доступна всем ролям, у Teacher read-only.

⸻

6) Нефункциональные требования и бюджеты
	•	Производительность:
	•	/api/leaderboard: P95 < 150 мс на 1–2k строк.
	•	Массовый ввод: батчи ≤ 100 записей; debounce 300–500 мс.
	•	Надёжность: idempotent upsert; миграции без ломающих изменений (вьюхи как контракт).
	•	Безопасность: вход только @planetenglish.ru; RLS в БД; SUPABASE_SERVICE_ROLE — только в серверной среде.
	•	Логи: писать ошибки API; счётчик вызовов batch-upsert.

⸻

7) Тест-пакеты (рекомендации для Cursor)

Unit/Contract (Vitest)
	•	GET /api/leaderboard?type=branch_overall возвращает поля: branch_id, branch_name, score, rank, delta_rank(number), delta_score(number), отсортирован по rank.
	•	GET /api/leaderboard?type=teacher_overall возвращает teacher_id, name, category in {Partner,Senior,Middle,Junior,Newcomer}, branch_name, score, rank, delta_*.

SQL/Logic
	•	metrics_batch_upsert меняет только изменённые строки; повторный вызов с теми же данными не меняет version/updated_at.
	•	recompute_current_scores корректно считает:
	•	teacher rank по score,
	•	branch score — взвешенный (сумма score×weight / сумма weight), weight = last_year_base + trial_total.
	•	snapshots: при изменении score/ранга создаётся новая запись; delta_* верны.

E2E (Playwright)
	•	Auth: пользователь @planetenglish.ru проходит; внешний домен — нет.
	•	RBAC: роли видят только свои разделы; скрытые страницы не открываются напрямую.
	•	Mass KPI Flow: ввод → сохранение → лидерборды обновились; стрелки отражают изменения от предыдущего снапшота.
	•	Призы: на branch leaderboard карточки ТОП-5 содержат призы согласно месту (иконки присутствуют).

⸻

8) Технические подсказки (для быстрой реализации)
	•	NextAuth Google: callbacks signIn (домен), events.signIn → RPC ensure_profile(email, avatar_url).
	•	Supabase:
	•	таблицы: profiles, branch, teacher, teacher_metrics, current_scores, snapshots;
	•	RPC: ensure_profile, metrics_batch_upsert, recompute_current_scores;
	•	VIEW: api_v1.vw_leaderboard_branch_overall_all, api_v1.vw_leaderboard_teacher_overall_all.
	•	Формат имени: делай helper shorten_full_name("Иванова Мария Петровна") → "Иванова Мария П." (как в дизайне).
	•	Призы для филиалов: маппинг по rank 1–5 (конфиг или CASE в вьюхе).
	•	Категории: enum/constraint в БД на 5 значений.

⸻

9) План релиза и чек-лист приёмки
	•	Авторизация Google + автопрофиль (Teacher by default).
	•	Admin вручную создал филиалы в System → Configuration.
	•	Admin назначил роли/категории/филиалы в System → Users.
	•	Mass KPI Input записывает в БД через RPC; лидерборды и стрелки обновляются.
	•	September Rating показывает реальные данные; призы для филиалов — как в дизайне.
	•	RBAC работает на всех маршрутах.
	•	Newcomers Rating — заглушка.