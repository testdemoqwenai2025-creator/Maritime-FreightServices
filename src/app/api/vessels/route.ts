import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const vesselType = searchParams.get('vesselType')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'All') where.status = status
    if (vesselType && vesselType !== 'All') where.vesselType = vesselType
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { callSign: { contains: search } },
        { flagCountry: { contains: search } },
      ]
    }

    const [vessels, total] = await Promise.all([
      db.vessel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastPosition: 'desc' },
        include: {
          carrier: { select: { name: true, code: true, alliance: true } },
          tradeRoute: { select: { name: true, code: true, originRegion: true, destRegion: true } },
        },
      }),
      db.vessel.count({ where }),
    ])

    return NextResponse.json({
      data: vessels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching vessels:', error)
    return NextResponse.json({ error: 'Failed to fetch vessels' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const vessel = await db.vessel.create({
      data: {
        mmsi: body.mmsi,
        imo: body.imo || null,
        name: body.name,
        callSign: body.callSign || null,
        vesselType: body.vesselType || 'Cargo',
        flagCountry: body.flagCountry || null,
        grossTonnage: body.grossTonnage || null,
        deadweight: body.deadweight || null,
        length: body.length || null,
        breadth: body.breadth || null,
        draft: body.draft || null,
        yearBuilt: body.yearBuilt || null,
        status: body.status || 'Active',
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        speed: body.speed || 0,
        heading: body.heading || null,
        destination: body.destination || null,
        eta: body.eta ? new Date(body.eta) : null,
        lastPosition: body.lastPosition ? new Date(body.lastPosition) : new Date(),
        carrierId: body.carrierId || null,
        tradeRouteId: body.tradeRouteId || null,
      },
    })

    return NextResponse.json(vessel, { status: 201 })
  } catch (error) {
    console.error('Error creating vessel:', error)
    return NextResponse.json({ error: 'Failed to create vessel' }, { status: 500 })
  }
}
