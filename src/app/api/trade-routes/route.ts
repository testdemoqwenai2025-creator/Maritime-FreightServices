import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const originRegion = searchParams.get('originRegion')
    const canalTransit = searchParams.get('canalTransit')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (originRegion && originRegion !== 'All') where.originRegion = originRegion
    if (canalTransit && canalTransit !== 'All') where.canalTransit = canalTransit
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { destRegion: { contains: search } },
      ]
    }

    const [routes, total] = await Promise.all([
      db.tradeRoute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { avgFreightPerTEU: 'desc' },
        include: {
          _count: {
            select: { vessels: true, shipments: true },
          },
        },
      }),
      db.tradeRoute.count({ where }),
    ])

    return NextResponse.json({
      data: routes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching trade routes:', error)
    return NextResponse.json({ error: 'Failed to fetch trade routes' }, { status: 500 })
  }
}
