import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const commodityGroup = searchParams.get('commodityGroup')
    const dangerous = searchParams.get('dangerous')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (category && category !== 'All') where.category = category
    if (commodityGroup && commodityGroup !== 'All') where.commodityGroup = commodityGroup
    if (dangerous !== null && dangerous !== undefined && dangerous !== 'All') {
      where.dangerous = dangerous === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { hsCode: { contains: search } },
        { hsChapter: { contains: search } },
      ]
    }

    const [cargoTypes, total] = await Promise.all([
      db.cargoType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tradeVolume: 'desc' },
      }),
      db.cargoType.count({ where }),
    ])

    return NextResponse.json({
      data: cargoTypes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching cargo types:', error)
    return NextResponse.json({ error: 'Failed to fetch cargo types' }, { status: 500 })
  }
}
