import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasAccess } from "@/lib/auth/permissions"
import { type UserRole } from "@/lib/constants/user-management"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const userRole = req.nextauth.token?.role as UserRole | undefined
    
    // Пропускаем публичные страницы и API маршруты
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/dev-login') ||
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
        
        // Пропускаем публичные страницы
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/dev-login') ||
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
     * - статические файлы (.png, .jpg, .svg и т.д.)
     * - sw.js (service worker)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.pdf|.*\\.txt|.*\\.json).*)',
  ],
}
