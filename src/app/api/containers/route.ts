import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const size = searchParams.get('size')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'All') where.status = status
    if (size && size !== 'All') where.size = size

    const [containers, total] = await Promise.all([
      db.container.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vessel: { select: { name: true, mmsi: true } },
          shipment: { select: { billOfLading: true, status: true, originPortId: true, destPortId: true } },
        },
      }),
      db.container.count({ where }),
    ])

    return NextResponse.json({ data: containers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Error fetching containers:', error)
    return NextResponse.json({ error: 'Failed to fetch containers' }, { status: 500 })
  }
}
