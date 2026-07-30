import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireRole } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { logAudit } from '@/lib/auth/audit'

const prisma = new PrismaClient()

/**
 * GET /api/auth/users — List users (Admin/Manager only)
 */
export async function GET() {
  try {
    const user = await requireRole('Manager')
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, organization: true,
        actorType: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Users GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/auth/users — Create a new user (Admin only)
 * Body: { email, name, password, role, organization?, actorType? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('Admin')
    const body = await request.json()
    const { email, name, password, role, organization, actorType } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: role || 'Viewer',
        organization: organization || null,
        actorType: actorType || 'Internal',
      },
      select: {
        id: true, email: true, name: true, role: true, organization: true, actorType: true, createdAt: true,
      },
    })

    await logAudit({
      userId: user.id, userRole: user.role, userOrg: user.organization ?? undefined,
      action: 'user.create', resource: 'User', resourceId: newUser.id,
      details: { email, role, organization },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[Users POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
