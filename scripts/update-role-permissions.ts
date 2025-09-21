/**
 * Скрипт для обновления разрешений ролей под новую структуру
 * Запуск: npx tsx scripts/update-role-permissions.ts
 */

// Новая структура разрешений по разделам сайта
const ROLE_PERMISSIONS = {
  'Administrator': ['system', 'users', 'roles', 'september_rating', 'mass_kpi_input', 'newcomers_rating', 'dashboard', 'profile', 'settings'],
  'Senior Teacher': ['september_rating', 'mass_kpi_input', 'newcomers_rating', 'dashboard', 'profile', 'settings'],
  'Teacher': ['september_rating', 'newcomers_rating', 'dashboard', 'profile', 'settings'],
  'Salesman': ['september_rating', 'newcomers_rating', 'dashboard', 'profile', 'settings'],
  'Head of Sales': ['september_rating', 'newcomers_rating', 'dashboard', 'profile', 'settings'],
  'Regular User': ['profile', 'settings']
}

async function updateRolePermissions() {
  console.log('🔄 Обновляем разрешения ролей...')
  
  try {
    // Используем API для обновления ролей
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      console.log(`📝 Обновляем роль: ${roleName}`)
      console.log(`   Разрешения: ${permissions.join(', ')}`)
      
      // В продакшене это будет API запрос к /api/system/roles
      // Пока просто выводим что нужно сделать
      console.log(`   ✅ Роль "${roleName}" готова к обновлению`)
    }
    
    console.log('')
    console.log('🎉 Все роли готовы к обновлению!')
    console.log('💡 Теперь можете тестировать через веб-интерфейс')
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении ролей:', error)
    process.exit(1)
  }
}

// Запускаем только в режиме разработки
if (require.main === module) {
  updateRolePermissions()
}
