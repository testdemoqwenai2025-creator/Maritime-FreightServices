import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'
import { hasPermission, getRolePermissions, ROLE_META } from '@/lib/auth/rbac'

/**
 * GET /api/auth/session — Get current session with role permissions
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ authenticated: false })
  }

  const role = (session.user as Record<string, unknown>).role as string || 'Viewer'
  const permissions = getRolePermissions(role)
  const meta = ROLE_META[role as keyof typeof ROLE_META]

  return NextResponse.json({
    authenticated: true,
    user: {
      id: (session.user as Record<string, unknown>).id,
      email: session.user.email,
      name: session.user.name,
      role,
      organization: (session.user as Record<string, unknown>).organization,
      actorType: (session.user as Record<string, unknown>).actorType,
    },
    permissions,
    roleMeta: meta,
  })
}
