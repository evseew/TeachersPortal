#!/bin/bash
set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка что мы в git репозитории
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Не git репозиторий"
        exit 1
    fi
}

# Проверка что рабочая копия чистая
check_clean_working_tree() {
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Рабочая копия не чистая. Закоммить или спрятать изменения:"
        git status --short
        exit 1
    fi
}

# Создание ветки
create_branch() {
    local branch_name="$1"
    
    log_info "Создаем ветку: $branch_name"
    
    # Проверки
    check_git_repo
    check_clean_working_tree
    
    # Проверка что ветка не существует
    if git show-ref --verify --quiet refs/heads/"$branch_name"; then
        log_error "Ветка '$branch_name' уже существует локально"
        exit 1
    fi
    
    if git ls-remote --heads origin "$branch_name" | grep -q "$branch_name"; then
        log_error "Ветка '$branch_name' уже существует на origin"
        exit 1
    fi
    
    # Обновляем main
    log_info "Обновляем main..."
    git fetch origin
    git checkout main
    git pull --ff-only origin main
    
    # Создаем ветку
    log_info "Создаем ветку '$branch_name'..."
    git checkout -b "$branch_name"
    
    # Запускаем проверки
    log_info "Устанавливаем зависимости..."
    pnpm install
    
    log_info "Проверяем код (lint)..."
    pnpm lint
    
    log_info "Запускаем тесты..."
    pnpm test
    
    # Пушим ветку
    log_info "Отправляем ветку на origin..."
    git push -u origin "$branch_name"
    
    log_success "Ветка '$branch_name' создана и готова к работе!"
    log_info "Текущая ветка: $(git branch --show-current)"
}

# Соединение ветки (squash merge)
merge_branch() {
    local branch_name="$1"
    
    log_info "Соединяем ветку: $branch_name"
    
    # Проверки
    check_git_repo
    check_clean_working_tree
    
    # Проверка что ветка существует
    if ! git show-ref --verify --quiet refs/heads/"$branch_name"; then
        log_error "Ветка '$branch_name' не существует локально"
        exit 1
    fi
    
    # Переключаемся на main и обновляем
    log_info "Переключаемся на main и обновляем..."
    git checkout main
    git pull --ff-only origin main
    
    # Делаем squash merge
    log_info "Делаем squash merge ветки '$branch_name'..."
    log_warning "Squash merge объединяет все коммиты в один - история ветки будет сжата"
    git merge --squash "$branch_name"
    
    # Проверяем что есть изменения для коммита
    if [ -z "$(git diff --cached)" ]; then
        log_warning "Нет изменений для коммита"
        exit 0
    fi
    
    # Коммитим
    log_info "Создаем merge коммит..."
    git commit -m "Merge branch '$branch_name' (squash)

All commits from '$branch_name' have been squashed into this single commit."
    
    # Пушим main
    log_info "Отправляем изменения в main..."
    git push origin main
    
    # Удаляем локальную ветку (принудительно, т.к. squash merge не показывает связь коммитов)
    log_info "Удаляем локальную ветку '$branch_name'..."
    git branch -D "$branch_name"
    
    # Удаляем удаленную ветку
    log_info "Удаляем удаленную ветку '$branch_name'..."
    git push origin --delete "$branch_name"
    
    log_success "Ветка '$branch_name' успешно соединена с main и удалена!"
    log_info "Текущая ветка: $(git branch --show-current)"
}

# Удаление ветки
delete_branch() {
    local branch_name="$1"
    
    log_info "Удаляем ветку: $branch_name"
    
    # Проверки
    check_git_repo
    
    # Проверка что мы не на удаляемой ветке
    current_branch=$(git branch --show-current)
    if [ "$current_branch" = "$branch_name" ]; then
        log_info "Переключаемся на main..."
        git checkout main
    fi
    
    # Удаляем локальную ветку (принудительно)
    if git show-ref --verify --quiet refs/heads/"$branch_name"; then
        log_info "Удаляем локальную ветку '$branch_name'..."
        git branch -D "$branch_name"
    else
        log_warning "Локальная ветка '$branch_name' не найдена"
    fi
    
    # Удаляем удаленную ветку
    if git ls-remote --heads origin "$branch_name" | grep -q "$branch_name"; then
        log_info "Удаляем удаленную ветку '$branch_name'..."
        git push origin --delete "$branch_name"
    else
        log_warning "Удаленная ветка '$branch_name' не найдена"
    fi
    
    log_success "Ветка '$branch_name' удалена!"
    log_info "Текущая ветка: $(git branch --show-current)"
}

# Показать справку
show_help() {
    echo "Использование: $0 <команда> <имя-ветки>"
    echo ""
    echo "Команды:"
    echo "  create <имя>   - Создать новую ветку из main"
    echo "  merge <имя>    - Соединить ветку с main (squash merge) и удалить"
    echo "  delete <имя>   - Удалить ветку локально и на origin"
    echo "  help           - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 create feature/новая-фича"
    echo "  $0 merge feature/новая-фича"
    echo "  $0 delete feature/старая-ветка"
}

# Основная логика
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    local command="$1"
    
    case "$command" in
        "create")
            if [ $# -ne 2 ]; then
                log_error "Команда create требует имя ветки"
                echo "Использование: $0 create <имя-ветки>"
                exit 1
            fi
            create_branch "$2"
            ;;
        "merge")
            if [ $# -ne 2 ]; then
                log_error "Команда merge требует имя ветки"
                echo "Использование: $0 merge <имя-ветки>"
                exit 1
            fi
            merge_branch "$2"
            ;;
        "delete")
            if [ $# -ne 2 ]; then
                log_error "Команда delete требует имя ветки"
                echo "Использование: $0 delete <имя-ветки>"
                exit 1
            fi
            delete_branch "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Неизвестная команда: $command"
            show_help
            exit 1
            ;;
    esac
}

# Запуск
main "$@"
