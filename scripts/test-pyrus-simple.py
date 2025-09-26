#!/usr/bin/env python3
"""
Простой тестовый скрипт для получения данных из Pyrus без зависимостей
"""

import asyncio
import os
import json
from typing import Dict, List, Any, Optional

# Конфигурация
PYRUS_API_URL = "https://api.pyrus.com/v4/"
PYRUS_LOGIN = os.getenv("PYRUS_LOGIN")
PYRUS_SECURITY_KEY = os.getenv("PYRUS_SECURITY_KEY")

# Если переменные не установлены, пробуем из файла .env.local
if not PYRUS_LOGIN or not PYRUS_SECURITY_KEY:
    try:
        with open('.env.local', 'r') as f:
            for line in f:
                if line.startswith('PYRUS_LOGIN='):
                    PYRUS_LOGIN = line.split('=', 1)[1].strip()
                elif line.startswith('PYRUS_SECURITY_KEY='):
                    PYRUS_SECURITY_KEY = line.split('=', 1)[1].strip()
    except FileNotFoundError:
        pass

class SimplePyrusClient:
    def __init__(self):
        self.access_token = None
        
    async def authenticate(self):
        """Авторизация в Pyrus"""
        import aiohttp
        
        if not PYRUS_LOGIN or not PYRUS_SECURITY_KEY:
            raise Exception("Переменные окружения PYRUS_LOGIN и PYRUS_SECURITY_KEY не установлены")
            
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{PYRUS_API_URL}auth",
                json={
                    "login": PYRUS_LOGIN,
                    "security_key": PYRUS_SECURITY_KEY
                }
            ) as response:
                if response.status != 200:
                    raise Exception(f"Ошибка авторизации: {response.status}")
                data = await response.json()
                self.access_token = data["access_token"]
                print("✅ Успешная авторизация")
                return self.access_token
    
    async def get_form_tasks(self, form_id: int, limit: int = 5):
        """Получение задач формы"""
        import aiohttp
        
        if not self.access_token:
            await self.authenticate()
            
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{PYRUS_API_URL}forms/{form_id}/register?item_count={limit}",
                headers={"Authorization": f"Bearer {self.access_token}"}
            ) as response:
                if response.status != 200:
                    raise Exception(f"Ошибка получения задач: {response.status}")
                data = await response.json()
                return data.get("tasks", [])
    
    async def get_task(self, task_id: int):
        """Получение конкретной задачи"""
        import aiohttp
        
        if not self.access_token:
            await self.authenticate()
            
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{PYRUS_API_URL}tasks/{task_id}",
                headers={"Authorization": f"Bearer {self.access_token}"}
            ) as response:
                if response.status != 200:
                    raise Exception(f"Ошибка получения задачи: {response.status}")
                data = await response.json()
                return data.get("task")

def get_field_value(task_fields: List[Dict[str, Any]], field_id: int) -> Any:
    """Извлечение значения поля по ID"""
    for field in task_fields or []:
        if field.get("id") == field_id:
            return field.get("value")
    return None

def analyze_field_structure(task_fields: List[Dict[str, Any]], form_id: int):
    """Анализ структуры полей"""
    
    # Важные поля для каждой формы
    important_fields = {
        2304918: {
            8: "Преподаватель",
            5: "Филиал", 
            64: "УЧИТСЯ (заполняет СО)",
            7: "Статус PE",
            27: "Прошел ли 1-е занятие?",
            32: "Прошел ли 2-е занятие?",
            25: "Статус выхода"
        },
        792300: {
            142: "Преподаватель",
            226: "Филиал",
            187: "УЧИТСЯ",
            228: "Статус PE",
            183: "Пришел на 1-е занятие?",
            198: "Пришел на 2-е занятие?"
        }
    }
    
    print(f"\n📋 АНАЛИЗ ВАЖНЫХ ПОЛЕЙ ФОРМЫ {form_id}:")
    fields_config = important_fields.get(form_id, {})
    
    for field_id, field_name in fields_config.items():
        value = get_field_value(task_fields, field_id)
        print(f"  ID:{field_id:3d} {field_name:30s} = {json.dumps(value, ensure_ascii=False)}")
    
    print(f"\n🐛 ВСЕ ПОЛЯ ЗАДАЧИ:")
    for field in task_fields[:10]:  # Показываем первые 10 полей
        field_id = field.get("id")
        field_name = field.get("name", "Без названия")
        field_value = field.get("value")
        print(f"  ID:{field_id:3d} {field_name:30s} = {json.dumps(field_value, ensure_ascii=False)}")
    
    if len(task_fields) > 10:
        print(f"  ... и еще {len(task_fields) - 10} полей")

async def main():
    """Главная функция"""
    client = SimplePyrusClient()
    
    try:
        # Получаем примеры задач из обеих форм
        print("🔍 Получаем примеры задач...")
        
        for form_id in [2304918, 792300]:
            form_name = "старички" if form_id == 2304918 else "новый клиент"
            print(f"\n{'='*60}")
            print(f"📋 ФОРМА {form_id} ({form_name})")
            print(f"{'='*60}")
            
            try:
                tasks = await client.get_form_tasks(form_id, 2)
                
                if not tasks:
                    print(f"❌ Нет задач в форме {form_id}")
                    continue
                
                # Анализируем первую задачу
                task = tasks[0]
                task_id = task.get("id")
                print(f"🆔 Анализируем задачу: {task_id}")
                print(f"📝 Название: {task.get('subject', 'Без названия')}")
                
                # Получаем полные данные задачи
                full_task = await client.get_task(task_id)
                if full_task:
                    task_fields = full_task.get("fields", [])
                    print(f"📊 Полей в задаче: {len(task_fields)}")
                    
                    # Анализируем структуру полей
                    analyze_field_structure(task_fields, form_id)
                    
                    # Сохраняем результат
                    result_file = f"scripts/debug-form-{form_id}-task-{task_id}.json"
                    with open(result_file, 'w', encoding='utf-8') as f:
                        json.dump({
                            "form_id": form_id,
                            "task_id": task_id,
                            "task_title": task.get('subject', 'Без названия'),
                            "fields": task_fields
                        }, f, ensure_ascii=False, indent=2)
                    print(f"💾 Данные сохранены в: {result_file}")
                
            except Exception as e:
                print(f"❌ Ошибка анализа формы {form_id}: {e}")
                
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Проверяем наличие aiohttp
    try:
        import aiohttp
    except ImportError:
        print("❌ Необходимо установить aiohttp: pip install aiohttp")
        exit(1)
    
    asyncio.run(main())
