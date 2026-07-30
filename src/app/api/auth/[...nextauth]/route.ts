import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import { verifyPassword } from '@/lib/auth/password'
import { logAudit } from '@/lib/auth/audit'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash || !user.isActive) {
          return null
        }

        const valid = await verifyPassword(credentials.password, user.passwordHash)
        if (!valid) return null

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Audit log
        const headers = request ? Object.fromEntries(request.headers) : {}
        await logAudit({
          userId: user.id,
          userRole: user.role,
          userOrg: user.organization ?? undefined,
          action: 'login',
          resource: 'Auth',
          ipAddress: headers['x-forwarded-for'] as string || headers['x-real-ip'] as string,
          userAgent: headers['user-agent'] as string,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization,
          actorType: user.actorType,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as Record<string, unknown>).role as string
        token.organization = (user as Record<string, unknown>).organization as string
        token.actorType = (user as Record<string, unknown>).actorType as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id
        (session.user as Record<string, unknown>).role = token.role
        (session.user as Record<string, unknown>).organization = token.organization
        (session.user as Record<string, unknown>).actorType = token.actorType
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'maritime-platform-phase6-dev-secret-change-in-production',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
