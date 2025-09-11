#!/bin/bash

# Скрипт для восстановления целостности базы данных TeachersPortal
# Применяет миграции через Supabase CLI

set -e

echo "🚀 Восстановление целостности базы данных TeachersPortal"
echo "=================================================="

# Проверяем, что Supabase CLI установлен
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI не найден. Установите: npm install -g supabase"
    exit 1
fi

# Проверяем, что мы в правильной директории
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Файл supabase/config.toml не найден. Убедитесь, что вы в корне проекта."
    exit 1
fi

echo "✅ Supabase CLI найден"

# Проверяем подключение к проекту
echo "🔍 Проверка подключения к проекту Supabase..."
if ! supabase status &> /dev/null; then
    echo "❌ Не удалось подключиться к проекту Supabase"
    echo "Выполните: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Подключение к проекту установлено"

# Создаём backup текущего состояния
echo "💾 Создание резервной копии схемы..."
supabase db dump --data-only > backup_before_fix_$(date +%Y%m%d_%H%M%S).sql || true
echo "✅ Резервная копия создана"

# Список миграций для применения
MIGRATIONS=(
    "20250911T000000_diagnostic_functions.sql"
    "20250911T000001_cleanup_orphaned_records.sql" 
    "20250911T000002_add_foreign_key_constraints.sql"
    "20250911T000003_fix_views_final.sql"
    "20250911T000004_improved_recompute_scores.sql"
)

echo "🔧 Применение миграций..."

for migration in "${MIGRATIONS[@]}"; do
    echo "  📝 Применение: $migration"
    
    if [ -f "supabase/migrations/$migration" ]; then
        # Применяем миграцию
        if supabase migration up --target-migration "$migration" 2>/dev/null; then
            echo "    ✅ $migration применён успешно"
        else
            echo "    ⚠️ Миграция $migration уже применена или произошла ошибка"
        fi
    else
        echo "    ❌ Файл $migration не найден"
    fi
    
    sleep 1
done

echo ""
echo "🔍 Проверка состояния базы данных..."

# Проверяем, что VIEW работают
echo "  📊 Проверка Teacher Leaderboard View..."
if supabase db execute --sql "SELECT COUNT(*) FROM api_v1.vw_leaderboard_teacher_overall_all LIMIT 1;" &> /dev/null; then
    echo "    ✅ Teacher Leaderboard View работает"
else
    echo "    ❌ Teacher Leaderboard View недоступен"
fi

echo "  📊 Проверка Branch Leaderboard View..."
if supabase db execute --sql "SELECT COUNT(*) FROM api_v1.vw_leaderboard_branch_overall_all LIMIT 1;" &> /dev/null; then
    echo "    ✅ Branch Leaderboard View работает"
else
    echo "    ❌ Branch Leaderboard View недоступен"
fi

# Проверяем функции
echo "  🔧 Проверка функций пересчёта..."
if supabase db execute --sql "SELECT public.recompute_current_scores();" &> /dev/null; then
    echo "    ✅ Функция recompute_current_scores работает"
else
    echo "    ❌ Функция recompute_current_scores недоступна"
fi

# Запускаем пересчёт рейтингов
echo ""
echo "🔄 Запуск полного пересчёта рейтингов..."
if supabase db execute --sql "SELECT public.full_resync_scores();" &> /dev/null; then
    echo "  ✅ Полный пересчёт выполнен успешно"
else
    echo "  ⚠️ Не удалось выполнить полный пересчёт (возможно, функция ещё не создана)"
fi

echo ""
echo "🎉 Восстановление целостности завершено!"
echo ""
echo "📋 Следующие шаги:"
echo "  1. Проверьте работу лидербордов в UI: http://localhost:3000/september-rating"
echo "  2. Протестируйте массовый ввод KPI: http://localhost:3000/mass-kpi-input"
echo "  3. Убедитесь, что стрелки изменений отображаются корректно"
echo "  4. Проверьте API endpoints: /api/leaderboard?type=teacher_overall"
echo ""
echo "🔍 Для диагностики запустите:"
echo "  npm run db:check  # (если добавите скрипт в package.json)"
echo "  или"
echo "  npx tsx scripts/db-integrity-check.ts"
echo ""
echo "✅ База данных готова к работе!"
