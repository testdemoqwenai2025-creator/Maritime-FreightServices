import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tradeFlow = searchParams.get('tradeFlow')
    const year = searchParams.get('year')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (tradeFlow && tradeFlow !== 'All') where.tradeFlow = tradeFlow
    if (year) where.year = parseInt(year)

    const [tradeData, total] = await Promise.all([
      db.tradeData.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fetchedAt: 'desc' },
      }),
      db.tradeData.count({ where }),
    ])

    return NextResponse.json({
      data: tradeData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching trade data:', error)
    return NextResponse.json({ error: 'Failed to fetch trade data' }, { status: 500 })
  }
}
