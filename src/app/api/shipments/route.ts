import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'All') where.status = status

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vessel: { select: { name: true, mmsi: true, flagCountry: true } },
          originPort: { select: { name: true, countryCode: true, unlocode: true } },
          destPort: { select: { name: true, countryCode: true, unlocode: true } },
          containers: true,
        },
      }),
      db.shipment.count({ where }),
    ])

    return NextResponse.json({
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching shipments:', error)
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const shipment = await db.shipment.create({
      data: {
        billOfLading: body.billOfLading || null,
        bookingRef: body.bookingRef || null,
        status: body.status || 'Booked',
        cargoType: body.cargoType || null,
        cargoWeight: body.cargoWeight || 0,
        cargoValue: body.cargoValue || null,
        cargoDesc: body.cargoDesc || null,
        hsCode: body.hsCode || null,
        vesselId: body.vesselId,
        originPortId: body.originPortId,
        destPortId: body.destPortId,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
        etd: body.etd ? new Date(body.etd) : null,
        eta: body.eta ? new Date(body.eta) : null,
        transitDays: body.transitDays || null,
        freightCost: body.freightCost || null,
        currency: body.currency || 'USD',
        shipper: body.shipper || null,
        consignee: body.consignee || null,
      },
    })

    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    console.error('Error creating shipment:', error)
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
