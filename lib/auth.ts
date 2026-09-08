import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prismaUnscoped } from './db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Kullanıcı adı ile giriş',
      credentials: {
        username: { label: 'Kullanıcı Adı', type: 'text' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null
        const identifier = credentials.username.toLowerCase().trim()
        // Kullanıcı adı asıl giriş yöntemi; e-posta ile giriş geriye dönük uyumluluk için korunuyor.
        const user =
          (await prismaUnscoped.user.findUnique({ where: { username: identifier } })) ??
          (await prismaUnscoped.user.findUnique({ where: { email: identifier } }))
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        await prismaUnscoped.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = (token as any).tenantId ?? null
      }
      return session
    },
  },
}
