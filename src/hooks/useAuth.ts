/**
 * useAuth — React hook for session and permission state.
 * Wraps next-auth useSession with typed role, permissions, and permission checks.
 */

'use client'

import { useSession, signOut } from 'next-auth/react'
import { hasPermission, getRolePermissions, meetsRoleRequirement, ROLE_META, type Resource, type Action, type Role } from '@/lib/auth/rbac'

interface AuthUser {
  id: string
  email: string
  name?: string | null
  role: string
  organization?: string | null
  actorType?: string | null
}

export function useAuth() {
  const { data: session, status } = useSession()
  const user = session?.user as unknown as AuthUser | undefined
  const role = (user?.role || 'Viewer') as Role

  return {
    user: user ?? null,
    role,
    roleMeta: ROLE_META[role],
    permissions: getRolePermissions(role),
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    can: (resource: Resource, action: Action) => hasPermission(role, resource, action),
    meetsRole: (requiredRole: string) => meetsRoleRequirement(role, requiredRole),
    signOut: () => signOut({ callbackUrl: '/login' }),
  }
}
