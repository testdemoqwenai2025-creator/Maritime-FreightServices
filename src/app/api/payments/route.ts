import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** GET /api/payments — List payments with aggregation */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.paymentType = type

    const [payments, total, statusDist] = await Promise.all([
      prisma.paymentLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.paymentLedger.count({ where }),
      prisma.paymentLedger.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
    ])

    const totalAmount = payments.reduce((s, p) => s + p.amount, 0)
    const completedAmount = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0)

    return NextResponse.json({
      payments,
      total,
      summary: {
        totalAmount: Math.round(totalAmount),
        completedAmount: Math.round(completedAmount),
        pendingAmount: Math.round(totalAmount - completedAmount),
        smartContractCount: payments.filter(p => p.paymentMethod === 'SmartContract').length,
      },
      statusDistribution: statusDist.map(d => ({
        status: d.status,
        count: d._count,
        amount: d._sum.amount ? Math.round(d._sum.amount) : 0,
      })),
    })
  } catch (error) {
    console.error('[Payments GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
