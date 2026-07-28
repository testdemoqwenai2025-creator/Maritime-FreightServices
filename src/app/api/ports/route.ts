import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const region = searchParams.get('region')
    const countryCode = searchParams.get('countryCode')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (region && region !== 'All') where.region = region
    if (countryCode && countryCode !== 'All') where.countryCode = countryCode
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { countryCode: { contains: search } },
        { unlocode: { contains: search } },
      ]
    }

    const [ports, total] = await Promise.all([
      db.port.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.port.count({ where }),
    ])

    return NextResponse.json({
      data: ports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching ports:', error)
    return NextResponse.json({ error: 'Failed to fetch ports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const port = await db.port.create({
      data: {
        name: body.name,
        countryCode: body.countryCode,
        region: body.region,
        latitude: body.latitude,
        longitude: body.longitude,
        unlocode: body.unlocode || null,
        portType: body.portType || 'Seaport',
        harborSize: body.harborSize || null,
        shelter: body.shelter || null,
        depth: body.depth || null,
        cargoTypes: body.cargoTypes || 'General Cargo',
        tidalRange: body.tidalRange || null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json(port, { status: 201 })
  } catch (error) {
    console.error('Error creating port:', error)
    return NextResponse.json({ error: 'Failed to create port' }, { status: 500 })
  }
}
