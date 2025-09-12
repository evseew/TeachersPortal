import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasAccess } from "@/lib/auth/permissions"
import { type UserRole } from "@/lib/constants/user-management"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const userRole = req.nextauth.token?.role as UserRole | undefined
    
    // Проверяем, отключена ли авторизация
    const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
    if (!authEnabled) {
      console.log(`🚫 Auth отключена - пропускаем все маршруты: ${pathname}`)
      return NextResponse.next()
    }
    
    // Пропускаем публичные страницы и API маршруты
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname === '/'
    ) {
      return NextResponse.next()
    }
    
    // Проверяем доступ к защищенным маршрутам
    if (!hasAccess(userRole, pathname)) {
      console.log(`🚫 Доступ запрещен: ${userRole} пытается попасть на ${pathname}`)
      
      // Если роль есть, но доступа нет - показываем 403 через redirect на специальную страницу
      if (userRole) {
        const searchParams = new URLSearchParams({ 
          message: 'Недостаточно прав для доступа к этой странице',
          role: userRole,
          attempted: pathname 
        })
        return NextResponse.redirect(new URL(`/auth/access-denied?${searchParams}`, req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Проверяем, отключена ли авторизация
        const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true"
        if (!authEnabled) {
          return true
        }
        
        // Пропускаем публичные страницы
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname === '/'
        ) {
          return true
        }
        
        // Для всех остальных страниц требуем токен
        return !!token
      },
    },
  }
)

// Конфигурация middleware - указываем, какие маршруты защищать
export const config = {
  matcher: [
    /*
     * Защищаем все маршруты кроме:
     * - api (кроме /api/auth)  
     * - _next/static (статические файлы)
     * - _next/image (оптимизация изображений)
     * - favicon.ico
     * - публичные файлы в /public
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
