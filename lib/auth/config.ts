import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

import { ensureProfile } from "@/lib/supabase/admin"

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
      // Роль/ветка будут подтягиваться позже из БД; пока прокидываем email
      if (session?.user && token?.email) {
        session.user.email = token.email as string
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
      } catch (error) {
        console.error("ensure_profile failed:", error)
      }
    },
  },
  session: {
    strategy: "jwt",
  },
}

export default authOptions


