import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'

const prisma = new PrismaClient()

/**
 * GET /api/audit-log — List audit log entries (Admin/Manager only)
 * Query params: action, resource, userId, limit, offset, from, to
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user.role, 'audit-log', 'view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (resource) where.resource = resource
    if (userId) where.userId = userId
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.createdAt = dateFilter
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, organization: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Action distribution for summary
    const actionDistribution = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    })

    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
      actionDistribution: actionDistribution.map(a => ({
        action: a.action,
        count: a._count,
      })),
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const err = error as { statusCode: number; message: string }
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[AuditLog GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
