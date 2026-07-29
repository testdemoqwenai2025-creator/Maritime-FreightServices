import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const charterType = searchParams.get('charterType')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (charterType && charterType !== 'All') where.charterType = charterType
    if (status && status !== 'All') where.status = status

    const [charters, total] = await Promise.all([
      db.charter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          vessel: { select: { name: true, mmsi: true, imo: true, vesselType: true, flagCountry: true } },
          carrier: { select: { name: true, code: true } },
        },
      }),
      db.charter.count({ where }),
    ])

    return NextResponse.json({
      data: charters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching charters:', error)
    return NextResponse.json({ error: 'Failed to fetch charters' }, { status: 500 })
  }
}
