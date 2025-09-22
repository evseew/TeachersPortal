import { NextResponse } from "next/server"
import { PyrusUsersClient } from "@/lib/pyrus/client"

/**
 * Тестовый endpoint для проверки подключения к Pyrus API
 * и исследования формата данных пользователей
 * 
 * GET /api/debug/pyrus-test
 */
export async function GET() {
  try {
    console.log('🔍 Начинаем тестирование Pyrus API...')
    
    const pyrusClient = new PyrusUsersClient()
    
    // Получаем всех пользователей для анализа структуры данных
    const allMembers = await pyrusClient.getMembers()
    console.log(`📊 Получено ${allMembers.length} пользователей из Pyrus`)
    
    // Получаем только активных пользователей
    const activeMembers = await pyrusClient.getActiveMembers()
    console.log(`✅ Из них активных: ${activeMembers.length}`)
    
    // Анализируем структуру данных
    const sampleUser = activeMembers[0]
    console.log('📋 Образец данных пользователя:', sampleUser)
    
    // Анализируем доступные роли
    const uniqueRoles = [...new Set(activeMembers.map(user => user.role).filter(Boolean))]
    console.log('🎭 Обнаруженные роли в Pyrus:', uniqueRoles)
    
    // Анализируем департаменты/филиалы
    const departmentInfo = activeMembers.map(user => ({
      dept_id: user.department_id,
      dept_name: user.department_name
    })).filter(dept => dept.dept_id || dept.dept_name)
    
    const uniqueDepartments = departmentInfo.reduce((acc, dept) => {
      const key = `${dept.dept_id}_${dept.dept_name}`
      if (!acc.some(d => `${d.dept_id}_${d.dept_name}` === key)) {
        acc.push(dept)
      }
      return acc
    }, [] as typeof departmentInfo)
    
    console.log('🏢 Обнаруженные департаменты:', uniqueDepartments)
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalUsers: allMembers.length,
        activeUsers: activeMembers.length,
        bannedUsers: allMembers.length - activeMembers.length,
      },
      roles: uniqueRoles,
      departments: uniqueDepartments,
      sampleUser: sampleUser ? {
        id: sampleUser.id,
        email: sampleUser.email,
        first_name: sampleUser.first_name,
        last_name: sampleUser.last_name,
        role: sampleUser.role,
        department_id: sampleUser.department_id,
        department_name: sampleUser.department_name,
        banned: sampleUser.banned,
      } : null,
      // Возвращаем первых 5 пользователей для анализа
      sampleUsers: activeMembers.slice(0, 5).map(user => ({
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role,
        department: user.department_name,
        banned: user.banned,
      }))
    })

  } catch (error: unknown) {
    console.error('❌ Ошибка при тестировании Pyrus API:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Неизвестная ошибка',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
