import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

// In development, allow running without AUTH_SECRET; in production it must be set.
const authSecret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'development'
    ? 'dev-secret-change-before-production'
    : undefined)

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  debug: false,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
})
