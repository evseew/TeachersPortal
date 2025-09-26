import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasAccess } from "@/lib/auth/permissions"
import { hasPluginRouteAccess } from "@/lib/auth/plugin-permissions"
import { type UserRole } from "@/lib/constants/user-management"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const userRole = req.nextauth.token?.role as UserRole | undefined
    
    // Пропускаем публичные страницы и API маршруты
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/devlogin') ||
      pathname === '/'
    ) {
      return NextResponse.next()
    }
    
    // В dev режиме для dev пользователя пропускаем проверку доступа к system путям
    const isDevSystemPath = process.env.NODE_ENV === 'development' &&
                           pathname.startsWith('/system') &&
                           req.nextauth.token?.email === 'dev@planetenglish.ru'

    // Проверяем доступ только если роль определена
    if (userRole && !isDevSystemPath) {
      // Сначала проверяем стандартные разрешения
      const hasStandardAccess = hasAccess(userRole, pathname)
      
      // Если нет стандартного доступа, проверяем плагины
      let hasPluginAccess = false
      if (!hasStandardAccess) {
        const pluginAccessResult = hasPluginRouteAccess(userRole, pathname)
        hasPluginAccess = pluginAccessResult.allowed
      }
      
      // Если нет ни стандартного, ни плагинного доступа
      if (!hasStandardAccess && !hasPluginAccess) {
        console.log(`🚫 Доступ запрещен: ${userRole} пытается попасть на ${pathname}`)

        // Показываем 403 через redirect на специальную страницу
        const searchParams = new URLSearchParams({
          message: 'Недостаточно прав для доступа к этой странице',
          role: userRole,
          attempted: pathname
        })
        return NextResponse.redirect(new URL(`/auth/access-denied?${searchParams}`, req.url))
      }
    }

    // Если роль не определена, логируем и пропускаем (роль будет получена позже)
    if (!userRole && !pathname.startsWith('/auth/') && !pathname.startsWith('/api/auth/')) {
      console.log(`⚠️ [Middleware] Роль не определена для ${pathname}, пропускаем (роль будет получена из БД)`)
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
          pathname.startsWith('/devlogin') ||
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
