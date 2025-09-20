import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { getAllowedRoutesForRole } from "@/lib/auth/permissions"

const allowedDomain = "planetenglish.ru"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email ?? ""
      if (!email) return false
      
      // Проверяем домен
      const domain = email.split("@")[1]
      if (domain !== allowedDomain) return false
      
      // Проверяем, существует ли пользователь в базе портала
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', email)
          .single()
        
        // Разрешаем вход только если пользователь существует в базе
        return !!profile
      } catch (error) {
        console.log(`Вход запрещен: пользователь ${email} не найден в базе портала`)
        return false
      }
    },
    async session({ session, token }) {
      if (session?.user && token?.email) {
        session.user.email = token.email as string
        
        // Для dev провайдера роль уже сохранена в токене
        if (token.role) {
          session.user.role = token.role as string
        } else {
          // Для OAuth провайдеров получаем роль из БД
          try {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('role')
              .eq('email', token.email)
              .single()
            
            if (profile) {
              session.user.role = profile.role
            }
          } catch (error) {
            console.error("Ошибка получения роли:", error)
            // Если не удалось получить роль, оставляем undefined
          }
        }
      }
      return session
    },
    async jwt({ token, account, profile, user }) {
      // Для credentials provider (dev-auto-login) данные приходят в user
      if (user?.email) {
        token.email = user.email
        token.role = user.role
      }
      
      // Для OAuth providers данные приходят в profile
      if (profile && (profile as any).email) {
        token.email = (profile as any).email
      }
      
      // Обогащаем токен правами из панели (через роль → маршруты)
      if (token.role) {
        token.allowedRoutes = getAllowedRoutesForRole(token.role as any)
        token.isAdmin = token.role === 'Administrator'
        token.permissionsUpdatedAt = new Date().toISOString()
      } else if (token.email) {
        // fallback: подтянуть роль из БД, если ещё не установлена
        try {
          const { data: profileRow } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('email', token.email)
            .single()
          if (profileRow?.role) {
            token.role = profileRow.role
            token.allowedRoutes = getAllowedRoutesForRole(profileRow.role as any)
            token.isAdmin = profileRow.role === 'Administrator'
            token.permissionsUpdatedAt = new Date().toISOString()
          }
        } catch {}
      }

      return token
    },
  },
  events: {
    async signIn(message) {
      const email = message.user?.email ?? ""
      console.log(`✅ Успешный вход пользователя: ${email}`)
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
}

export default authOptions


