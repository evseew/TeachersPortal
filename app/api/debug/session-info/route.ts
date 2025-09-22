import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { hasAccess } from "@/lib/auth/permissions"
import { type UserRole } from "@/lib/constants/user-management"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [SessionInfo] Получаем информацию о сессии...")
    
    const session = await getServerSession(authOptions)
    const userRole = session?.user?.role as UserRole | undefined
    
    const result = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user || null,
        role: userRole || null
      },
      permissions: {
        "/system": hasAccess(userRole, "/system"),
        "/system/users": hasAccess(userRole, "/system/users"),
        "/dashboard": hasAccess(userRole, "/dashboard")
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        isDev: process.env.NODE_ENV === 'development'
      }
    }
    
    console.log(`🔍 [SessionInfo] Session exists: ${!!session}`)
    console.log(`🔍 [SessionInfo] User role: ${userRole || 'undefined'}`)
    console.log(`🔍 [SessionInfo] /system/users access: ${hasAccess(userRole, "/system/users")}`)
    
    return NextResponse.json(result, { status: 200 })
    
  } catch (error: unknown) {
    console.error("💥 [SessionInfo] Ошибка:", error)
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
