import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const alliance = searchParams.get('alliance')
    const country = searchParams.get('country')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (alliance && alliance !== 'All') where.alliance = alliance
    if (country && country !== 'All') where.country = country
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { country: { contains: search } },
      ]
    }

    const [carriers, total] = await Promise.all([
      db.carrier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { totalTEUCapacity: 'desc' },
        include: {
          _count: {
            select: {
              vessels: true,
              shipments: true,
              charters: true,
              bookings: true,
            },
          },
        },
      }),
      db.carrier.count({ where }),
    ])

    return NextResponse.json({
      data: carriers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching carriers:', error)
    return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const carrier = await db.carrier.create({
      data: {
        name: body.name,
        code: body.code || null,
        country: body.country || null,
        headquarters: body.headquarters || null,
        website: body.website || null,
        foundedYear: body.foundedYear || null,
        fleetSize: body.fleetSize || null,
        totalTEUCapacity: body.totalTEUCapacity || null,
        alliance: body.alliance || null,
        isTop20: body.isTop20 ?? false,
        isFCL: body.isFCL ?? true,
        isLCL: body.isLCL ?? true,
        isBreakBulk: body.isBreakBulk ?? false,
        isReefer: body.isReefer ?? true,
        isDG: body.isDG ?? true,
        serviceRoutes: body.serviceRoutes || null,
        transitTimeDays: body.transitTimeDays || null,
        reliability: body.reliability || null,
        co2PerTeu: body.co2PerTeu || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json(carrier, { status: 201 })
  } catch (error) {
    console.error('Error creating carrier:', error)
    return NextResponse.json({ error: 'Failed to create carrier' }, { status: 500 })
  }
}
