/**
 * Session helper — get current user from NextAuth session in API routes.
 * Phase 6: Digital Supply Chain
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: string
  organization?: string | null
  actorType?: string | null
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as unknown as SessionUser
}

/**
 * Require authentication — throws a 401 response if not logged in.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError('Authentication required', 401)
  }
  return user
}

/**
 * Require a specific role level or higher.
 * Throws 403 if the user doesn't meet the requirement.
 */
export async function requireRole(minRole: string): Promise<SessionUser> {
  const user = await requireAuth()
  const { meetsRoleRequirement } = await import('@/lib/auth/rbac')
  if (!meetsRoleRequirement(user.role, minRole)) {
    throw new AuthError(`Insufficient permissions. Required: ${minRole}, Got: ${user.role}`, 403)
  }
  return user
}

/**
 * Custom error class for auth failures.
 */
export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AuthError'
  }
}
