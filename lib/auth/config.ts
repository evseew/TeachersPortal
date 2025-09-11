import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

import { ensureProfile, supabaseAdmin } from "@/lib/supabase/admin"
import { ADMIN_EMAILS } from "@/lib/constants/user-management"

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
      const domain = email.split("@")[1]
      return domain === allowedDomain
    },
    async session({ session, token }) {
      if (session?.user && token?.email) {
        session.user.email = token.email as string
        
        // Получаем роль пользователя из БД
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
      return session
    },
    async jwt({ token, account, profile }) {
      // Пока без доп. полей, сохраняем email
      if (profile && (profile as any).email) {
        token.email = (profile as any).email
      }
      return token
    },
  },
  events: {
    async signIn(message) {
      const email = message.user?.email ?? ""
      if (!email) return
      const fullName = message.user?.name ?? null
      const avatarUrl = message.user?.image ?? null
      
      // Тихо пытаемся создать/обновить профиль. Ошибки логируем, но не блокируем вход.
      try {
        await ensureProfile({ email, avatarUrl, fullName })
        
        // Дополнительная защита: принудительно устанавливаем роль Administrator для захардкоженных email'ов
        // Это дублирует логику из ensure_profile, но обеспечивает дополнительную защиту
        if (ADMIN_EMAILS.includes(email as any)) {
          await supabaseAdmin
            .from('profiles')
            .update({ role: 'Administrator' })
            .eq('email', email)
          console.log(`🔒 Установлена роль Administrator для захардкоженного админа: ${email}`)
        }
      } catch (error) {
        console.error("ensure_profile failed:", error)
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
}

export default authOptions


