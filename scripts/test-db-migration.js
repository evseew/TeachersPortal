/**
 * Тест подключения к БД и применение миграции для роли Regular User
 * 
 * Запуск: node scripts/test-db-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Загружаем переменные окружения
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  const env = {}
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        env[key.trim()] = value
      }
    })
  }
  
  return env
}

async function testDatabaseMigration() {
  console.log('🔧 Тест подключения к БД и миграции')
  console.log('=' * 50)
  
  const env = loadEnv()
  
  const supabaseUrl = env.SUPABASE_URL
  const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE
  
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE в .env.local')
    process.exit(1)
  }
  
  console.log('📡 Подключение к Supabase...')
  console.log(`🌐 URL: ${supabaseUrl}`)
  
  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false }
  })
  
  try {
    // 1. Тест подключения
    console.log('\n1️⃣ Тестируем подключение к БД...')
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    
    if (connectionError) {
      throw connectionError
    }
    
    console.log('   ✅ Подключение к БД работает')
    console.log(`   📊 Пользователей в БД: ${connectionTest?.length || 0}`)
    
    // 2. Проверяем текущий enum user_role
    console.log('\n2️⃣ Проверяем текущие роли в БД...')
    
    const { data: enumData, error: enumError } = await supabase
      .rpc('get_enum_values', { enum_name: 'user_role' })
      .single()
    
    if (enumError) {
      // Если RPC не существует, создадим функцию для проверки enum
      console.log('   🔧 Создаем функцию для проверки enum...')
      
      const createEnumCheckFunction = `
        CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
        RETURNS text[]
        LANGUAGE plpgsql
        AS $$
        DECLARE
          enum_values text[];
        BEGIN
          SELECT array_agg(enumlabel ORDER BY enumsortorder)
          INTO enum_values
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = enum_name;
          
          RETURN enum_values;
        END;
        $$;
      `
      
      const { error: createFuncError } = await supabase.rpc('exec_sql', { 
        sql: createEnumCheckFunction 
      })
      
      if (createFuncError) {
        console.log('   ⚠️  Не удалось создать функцию проверки enum, используем альтернативный метод')
        
        // Альтернативный способ - просто попробуем добавить роль
        console.log('\n3️⃣ Применяем миграцию для добавления роли Regular User...')
        
        const addRegularUserRole = `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum e
              JOIN pg_type t ON e.enumtypid = t.oid
              WHERE t.typname = 'user_role' AND e.enumlabel = 'Regular User'
            ) THEN
              ALTER TYPE user_role ADD VALUE 'Regular User';
              RAISE NOTICE 'Роль Regular User добавлена';
            ELSE
              RAISE NOTICE 'Роль Regular User уже существует';
            END IF;
          END $$;
        `
        
        const { error: migrationError } = await supabase.rpc('exec_sql', { 
          sql: addRegularUserRole 
        })
        
        if (migrationError) {
          console.log('   ⚠️  Не удалось применить миграцию через RPC, используем прямой запрос')
          
          // Прямое добавление роли
          const { error: directError } = await supabase
            .from('profiles')
            .update({ role: 'Regular User' })
            .eq('user_id', '00000000-0000-0000-0000-000000000000') // Несуществующий ID
          
          if (directError && !directError.message.includes('invalid input value for enum user_role: "Regular User"')) {
            console.log('   ✅ Роль Regular User уже существует в БД')
          } else if (directError && directError.message.includes('invalid input value for enum user_role: "Regular User"')) {
            console.log('   ❌ Роль Regular User отсутствует в БД и требует ручного добавления')
            console.log('   📋 Выполните в Supabase SQL Editor:')
            console.log('       ALTER TYPE user_role ADD VALUE \'Regular User\';')
          }
        } else {
          console.log('   ✅ Миграция применена успешно')
        }
      }
    } else {
      console.log('   📋 Текущие роли в БД:', enumData)
      
      if (enumData && enumData.includes('Regular User')) {
        console.log('   ✅ Роль Regular User уже существует')
      } else {
        console.log('   ⚠️  Роль Regular User отсутствует, требуется миграция')
      }
    }
    
    // 4. Тест создания тестового пользователя
    console.log('\n4️⃣ Тестируем создание пользователя с ролью Regular User...')
    
    const testEmail = `test-pyrus-${Date.now()}@example.com`
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        email: testEmail,
        full_name: 'Test Pyrus User',
        role: 'Regular User'
      })
      .select()
    
    if (insertError) {
      if (insertError.message.includes('invalid input value for enum user_role: "Regular User"')) {
        console.log('   ❌ Роль Regular User не добавлена в БД')
        console.log('   📋 Требуется ручное выполнение SQL:')
        console.log('       ALTER TYPE user_role ADD VALUE \'Regular User\';')
      } else {
        console.log(`   ❌ Ошибка создания тестового пользователя: ${insertError.message}`)
      }
    } else {
      console.log('   ✅ Тестовый пользователь создан с ролью Regular User')
      
      // Удаляем тестового пользователя
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', testEmail)
      
      if (!deleteError) {
        console.log('   🗑️  Тестовый пользователь удален')
      }
    }
    
    console.log('\n🎉 Тест БД завершен!')
    
  } catch (error) {
    console.error('❌ Ошибка тестирования БД:', error.message)
  }
}

testDatabaseMigration()
